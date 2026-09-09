#!/usr/bin/env python3
"""Validate publication assets and make a decoded-motion contact sheet.

Run with a Python environment containing Pillow, NumPy and imageio-ffmpeg:
    python scripts/verify-collection.py

--available checks one snapshot of completed assets during an ongoing render.
Partial runs write validation-assets.available.json and motion-contact.available.png.
The default run requires the complete catalogue and exits nonzero if
any file, manifest, dimension, frame count, or decoding check fails.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import subprocess
import sys
import time
from datetime import datetime, timezone

try:
    import imageio_ffmpeg
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError as error:
    raise SystemExit(
        "Asset QA needs Pillow, NumPy and imageio-ffmpeg. "
        "Install them in your Python environment before running this script. "
        f"Missing dependency: {error.name}"
    ) from error


SCENES = ()
PALETTES = {}
MOVIE_CRFS = {}
FPS = 30
STILL_SIZE = 2400
MOVIE_SIZE = 1440
ANALYSIS_SIZE = 360
PHASES = (0.0, 0.25, 0.5, 0.75)
LUMA_WEIGHTS = np.array((0.2126, 0.7152, 0.0722), dtype=np.float32)


def finite_float(value: float, digits: int = 6) -> float:
    value = float(value)
    if not math.isfinite(value):
        raise ValueError("A computed image metric is not finite.")
    return round(value, digits)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def validate_manifest(path: Path, scene: str, duration: int, kind: str) -> tuple[dict, list[str]]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    parameters = manifest.get("parameters", {})
    expected = {
        "scene": scene,
        "size": STILL_SIZE if kind == "png" else MOVIE_SIZE,
        "seed": 42,
        "variation": 0.5,
        "fps": FPS,
        "duration": duration,
        "count": 360000,
        "samples": 16 if kind == "png" else 8,
        "shutter": 0.65,
        "exposure": 1,
        "palette": PALETTES.get(scene, "silver"),
    }
    if kind == "png":
        expected["time"] = 0.15
    for name, value in expected.items():
        actual = parameters.get(name)
        matches = actual == value
        if isinstance(value, float) and isinstance(actual, (int, float)):
            matches = math.isclose(actual, value, rel_tol=0, abs_tol=1e-9)
        require(matches, f"Manifest {name}: expected {value!r}, found {actual!r}.", errors)
    require(manifest.get("format") == kind, f"Manifest format must be {kind}.", errors)
    require(manifest.get("frameCount") == (1 if kind == "png" else FPS * duration), "Manifest frame count is incorrect.", errors)
    require(manifest.get("generator") == "Loop Atelier", "Manifest generator is missing or unexpected.", errors)
    for version in ("engineVersion", "exporterVersion", "browserVersion"):
        require(bool(manifest.get(version)), f"Manifest lacks {version}.", errors)
    encoding = manifest.get("encoding", {})
    require(encoding.get("codec") == ("png" if kind == "png" else "libx264"), "Manifest codec does not match the publication preset.", errors)
    if kind == "png":
        require(encoding.get("lossless") is True, "Still manifest does not identify a lossless output.", errors)
    else:
        require(encoding.get("pixelFormat") == "yuv420p", "Movie manifest pixel format must be yuv420p.", errors)
        expected_crf = MOVIE_CRFS.get(scene, 16)
        require(encoding.get("crf") == expected_crf, f"Movie manifest CRF must be {expected_crf} for {scene}.", errors)
    return manifest, errors


def check_still(path: Path, scene: str, duration: int) -> dict:
    manifest, errors = validate_manifest(Path(str(path) + ".manifest.json"), scene, duration, "png")
    before = path.stat()
    with Image.open(path) as image:
        require(image.format == "PNG", "Still is not a PNG file.", errors)
        require(image.size == (STILL_SIZE, STILL_SIZE), f"Still dimensions are {image.size}; expected {STILL_SIZE} square.", errors)
        image.verify()  # Verify the PNG structure and chunk integrity.
    with Image.open(path) as image:
        image.load()  # Fully decode pixel data after verification.
        mode = image.mode
        width, height = image.size
        if "A" in image.getbands():
            require(image.getchannel("A").getextrema() == (255, 255), "Publication still contains transparent pixels.", errors)
        rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    floating = rgb.astype(np.float32)
    luminance = floating @ LUMA_WEIGHTS
    require(bool(np.isfinite(luminance).all()), "Still luminance contains non-finite values.", errors)
    # A 24 px patch in each corner is a robust estimate of the matte color.
    corners = np.concatenate((rgb[:24, :24].reshape(-1, 3), rgb[:24, -24:].reshape(-1, 3),
                              rgb[-24:, :24].reshape(-1, 3), rgb[-24:, -24:].reshape(-1, 3)))
    background = np.median(corners, axis=0).astype(np.float32)
    foreground = np.max(np.abs(floating - background), axis=2) > 8
    coverage = float(foreground.mean())
    border = np.concatenate((foreground[0], foreground[-1], foreground[1:-1, 0], foreground[1:-1, -1]))
    histogram = np.bincount(np.clip(np.rint(luminance), 0, 255).astype(np.uint8).ravel(), minlength=256)
    require(bool(np.isfinite(histogram).all()) and int(histogram.sum()) == width * height, "Still histogram is invalid.", errors)
    require(float(luminance.std()) > 0.5, "Still appears blank or nearly uniform.", errors)
    warnings = []
    if coverage < 0.005 or coverage > 0.98:
        warnings.append("Foreground coverage is outside the broad expected range; inspect composition.")
    if float(border.mean()) > 0.03:
        warnings.append("Visible foreground reaches more than 3% of the image border; inspect cropping.")
    after = path.stat()
    require(before.st_size == after.st_size and before.st_mtime_ns == after.st_mtime_ns, "Still changed while being validated.", errors)
    return {
        "status": "failed" if errors else "passed",
        "file": str(path), "bytes": after.st_size, "sha256": sha256(path),
        "dimensions": [width, height], "mode": mode,
        "manifest_parameters": manifest["parameters"],
        "background_rgb_8bit": [finite_float(value, 2) for value in background],
        "nonbackground_fraction": finite_float(coverage),
        "edge_nonbackground_fraction": finite_float(border.mean()),
        "brightness_mean": finite_float(luminance.mean() / 255),
        "brightness_max": finite_float(luminance.max() / 255),
        "brightness_std": finite_float(luminance.std() / 255),
        "highlight_fraction_luminance_at_least_0_95": finite_float((luminance >= 0.95 * 255).mean()),
        "histogram_finite": True,
        "luminance_histogram_256_bins": [int(value) for value in histogram],
        "errors": errors, "review_notes": warnings,
    }


def check_movie(path: Path, scene: str, duration: int, ffmpeg: str) -> tuple[dict, list[Image.Image | None]]:
    manifest, errors = validate_manifest(Path(str(path) + ".manifest.json"), scene, duration, "mp4")
    expected_count = FPS * duration
    before = path.stat()
    # This pass decodes the original-resolution stream independently of the
    # downscaled analysis pass. -xerror makes decoder errors fail the check.
    decoded = subprocess.run(
        [ffmpeg, "-hide_banner", "-v", "error", "-xerror", "-nostdin", "-i", str(path),
         "-map", "0:v:0", "-an", "-f", "null", "-"],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=300,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    require(decoded.returncode == 0, f"Full-resolution FFmpeg decode failed: {decoded.stderr.strip()}", errors)
    require(not decoded.stderr.strip(), f"FFmpeg reported decoding errors: {decoded.stderr.strip()}", errors)
    phases = [round(phase * expected_count) for phase in PHASES]
    samples: dict[int, Image.Image] = {}
    differences: list[float] = []
    denoised_differences: list[float] = []
    first = None
    previous = None
    count = 0
    frame_generator = imageio_ffmpeg.read_frames(
        str(path), pix_fmt="rgb24", bits_per_pixel=24,
        output_params=["-vf", f"scale={ANALYSIS_SIZE}:{ANALYSIS_SIZE}:flags=lanczos", "-vsync", "0"],
    )
    try:
        metadata = next(frame_generator)
        require(tuple(metadata["source_size"]) == (MOVIE_SIZE, MOVIE_SIZE), f"Movie dimensions are {metadata['source_size']}; expected {MOVIE_SIZE} square.", errors)
        require(math.isclose(metadata["fps"], FPS, abs_tol=0.0001), f"Movie FPS is {metadata['fps']}; expected {FPS}.", errors)
        require(math.isclose(metadata["duration"], duration, abs_tol=0.02), f"Movie duration is {metadata['duration']}; expected {duration} seconds.", errors)
        require(metadata.get("codec") == "h264", f"Movie codec is {metadata.get('codec')!r}; expected h264.", errors)
        require("yuv420p" in metadata.get("pix_fmt", ""), "Decoded movie metadata does not identify yuv420p.", errors)
        require("bt709" in metadata.get("pix_fmt", ""), "Decoded movie metadata does not identify BT.709.", errors)
        require("tv" in metadata.get("pix_fmt", ""), "Decoded movie metadata does not identify limited range.", errors)
        for raw in frame_generator:
            rgb = np.frombuffer(raw, dtype=np.uint8).reshape(ANALYSIS_SIZE, ANALYSIS_SIZE, 3)
            gray = rgb.astype(np.float32) @ LUMA_WEIGHTS
            if first is None:
                first = gray.copy()
            if previous is not None:
                difference = np.abs(gray - previous)
                differences.append(float(difference.mean()))
                denoised_differences.append(float(np.maximum(difference - 2.0, 0).mean()))
            if count in phases:
                samples[count] = Image.fromarray(rgb.copy())
            previous = gray
            count += 1
    finally:
        frame_generator.close()
    require(count == expected_count, f"Decoded {count} frames; expected {expected_count}.", errors)
    require(count == manifest.get("frameCount"), "Decoded frame count disagrees with the manifest.", errors)
    require(count > 1, "Movie has fewer than two decodable frames.", errors)
    if first is None or previous is None or not differences:
        raise ValueError("Cannot compute continuity: insufficient decoded frames.")
    seam_difference = np.abs(previous - first)
    seam_mae = float(seam_difference.mean())
    seam_denoised = float(np.maximum(seam_difference - 2.0, 0).mean())
    median = float(np.median(differences))
    median_denoised = float(np.median(denoised_differences))
    seam_ratio = seam_mae / max(median, 1e-6)
    denoised_ratio = seam_denoised / max(median_denoised, 1e-6)
    warnings = []
    # This is a review heuristic, not a proof of periodic motion. Speed and
    # occlusion legitimately vary through a loop; inspect flagged seams.
    if seam_ratio > 3 and seam_mae > median + 0.2:
        warnings.append("The last-to-first change exceeds three times the median ordinary adjacent change; inspect the seam in motion.")
    if max(differences) < 0.02:
        warnings.append("The decoded movie has very little measurable motion; inspect for a frozen export.")
    after = path.stat()
    require(before.st_size == after.st_size and before.st_mtime_ns == after.st_mtime_ns, "Movie changed while being validated.", errors)
    result = {
        "status": "failed" if errors else "passed",
        "file": str(path), "bytes": after.st_size, "sha256": sha256(path),
        "full_resolution_decode_passed": decoded.returncode == 0 and not decoded.stderr.strip(),
        "decoder": metadata,
        "decoded_frame_count": count,
        "duration_from_count_seconds": finite_float(count / FPS),
        "manifest_parameters": manifest["parameters"],
        "motion_analysis": {
            "analysis_dimensions": [ANALYSIS_SIZE, ANALYSIS_SIZE],
            "luminance_units": "8-bit code values (0–255), Rec.709 weighted decoded RGB",
            "ordinary_adjacent_comparisons": len(differences),
            "adjacent_mae_min": finite_float(min(differences)),
            "adjacent_mae_median": finite_float(median),
            "adjacent_mae_p95": finite_float(np.percentile(differences, 95)),
            "adjacent_mae_max": finite_float(max(differences)),
            "last_to_first_mae": finite_float(seam_mae),
            "seam_to_median_adjacent_ratio": finite_float(seam_ratio),
            "noise_deadband_8bit": 2,
            "adjacent_deadband_mae_median": finite_float(median_denoised),
            "last_to_first_deadband_mae": finite_float(seam_denoised),
            "deadband_seam_to_median_ratio": finite_float(denoised_ratio),
            "contact_frames": [
                {"requested_phase": phase, "frame_index": index, "actual_phase": finite_float(index / count)}
                for phase, index in zip(PHASES, phases)
            ],
        },
        "errors": errors, "review_notes": warnings,
    }
    return result, [samples.get(index) for index in phases]


def font(size: int, serif: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/georgia.ttf" if serif else "C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf" if serif else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Georgia.ttf" if serif else "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)


def make_contact_sheet(destination: Path, contact_frames: dict[str, list[Image.Image | None]], partial: bool) -> None:
    margin, tile, gap, header, row_height = 40, 300, 16, 160, 354
    width = 2 * margin + 4 * tile + 3 * gap
    height = header + len(SCENES) * row_height + 42
    sheet = Image.new("RGB", (width, height), "#e9e7e0")
    draw = ImageDraw.Draw(sheet)
    title_font, row_font, small_font = font(40, serif=True), font(21), font(15)
    draw.text((margin, 28), "Loop Atelier / motion proofs", font=title_font, fill="#1d2427")
    subtitle = "Decoded publication movies · four phases per loop · 30 frames per second"
    if partial:
        subtitle += " · PARTIAL COLLECTION"
    draw.text((margin, 83), subtitle, font=small_font, fill="#586065")
    draw.line((margin, 116, width - margin, 116), fill="#a9acaa", width=1)
    for column, phase in enumerate(PHASES):
        draw.text((margin + column * (tile + gap), 131), f"PHASE {phase:.2f}", font=small_font, fill="#586065")
    for row, (scene, title, duration) in enumerate(SCENES):
        top = header + row * row_height
        draw.text((margin, top + 3), f"{row + 1:02d}   {title}", font=row_font, fill="#1d2427")
        detail = f"{duration} s / {duration * FPS} frames / 1440 × 1440"
        draw.text((width - margin - draw.textlength(detail, font=small_font), top + 8), detail, font=small_font, fill="#586065")
        frames = contact_frames.get(scene, [None] * 4)
        for column, frame in enumerate(frames):
            left, image_top = margin + column * (tile + gap), top + 36
            if frame is not None:
                sheet.paste(frame.resize((tile, tile), Image.Resampling.LANCZOS), (left, image_top))
            else:
                draw.rectangle((left, image_top, left + tile - 1, image_top + tile - 1), fill="#101417")
                label = "Not yet validated" if partial else "Missing / failed asset"
                draw.text((left + 24, image_top + tile // 2), label, font=small_font, fill="#b9c0c2")
    draw.text((margin, height - 31), "Visual inspection aid. Automated continuity metrics are recorded in the accompanying validation JSON.", font=small_font, fill="#586065")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.stem + ".tmp.png")
    sheet.save(temporary, format="PNG", optimize=True)
    temporary.replace(destination)


def main() -> int:
    global SCENES, PALETTES, MOVIE_CRFS
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--available", action="store_true", help="Check only complete assets currently present; write clearly named partial QA outputs.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent, help="Project directory; defaults to the directory above scripts.")
    arguments = parser.parse_args()
    root = arguments.root.resolve()
    output = root / "output"
    catalogue = json.loads((output / 'catalog.json').read_text(encoding='utf-8'))
    SCENES = tuple((s['id'], s['title'], s['duration']) for s in catalogue)
    PALETTES = {s['id']: s.get('palette', 'silver') for s in catalogue}
    MOVIE_CRFS = {s['id']: s.get('movieCrf', 16) for s in catalogue}
    output.mkdir(parents=True, exist_ok=True)
    suffix = ".available" if arguments.available else ""
    report_path = output / f"validation-assets{suffix}.json"
    contact_path = output / "qa" / f"motion-contact{suffix}.png"
    logging.getLogger("imageio_ffmpeg").setLevel(logging.ERROR)
    ffmpeg = os.environ.get("FFMPEG_PATH") or imageio_ffmpeg.get_ffmpeg_exe()
    started = time.perf_counter()
    # Snapshot once. Assets completed later are picked up by the next explicit run.
    assets = {
        scene: {
            kind: output / ("stills" if kind == "png" else "loops") / f"{scene}.{kind}"
            for kind in ("png", "mp4")
        }
        for scene, _, _ in SCENES
    }
    complete = {
        (scene, kind): path.is_file() and Path(str(path) + ".manifest.json").is_file()
        for scene, entries in assets.items() for kind, path in entries.items()
    }
    results: dict[str, dict] = {}
    contact_frames: dict[str, list[Image.Image | None]] = {}
    missing = []
    for scene, title, duration in SCENES:
        results[scene] = {}
        for kind in ("png", "mp4"):
            path = assets[scene][kind]
            if not complete[(scene, kind)]:
                missing.append(str(path))
                results[scene][kind] = {
                    "status": "not_available" if arguments.available else "failed", "file": str(path),
                    "errors": [] if arguments.available else ["Asset or its manifest is missing."], "review_notes": [],
                }
                continue
            print(f"Checking {title} {kind.upper()}...", flush=True)
            try:
                if kind == "png":
                    result = check_still(path, scene, duration)
                    print(f"  {result['status']} / foreground {100 * result['nonbackground_fraction']:.1f}% / peak luminance {result['brightness_max']:.3f}", flush=True)
                else:
                    result, contact_frames[scene] = check_movie(path, scene, duration, ffmpeg)
                    ratio = result["motion_analysis"]["seam_to_median_adjacent_ratio"]
                    print(f"  {result['status']} / {result['decoded_frame_count']} frames / seam-to-adjacent ratio {ratio:.3f}", flush=True)
                results[scene][kind] = result
            except Exception as error:
                results[scene][kind] = {"status": "failed", "file": str(path), "errors": [str(error)], "review_notes": []}
                print(f"  FAILED: {error}", file=sys.stderr, flush=True)
    flat = [asset for scene in results.values() for asset in scene.values()]
    failed = sum(asset["status"] == "failed" for asset in flat)
    passed = sum(asset["status"] == "passed" for asset in flat)
    review_count = sum(len(asset.get("review_notes", [])) for asset in flat)
    make_contact_sheet(contact_path, contact_frames, arguments.available)
    report = {
        "validator": "Loop Atelier publication asset QA", "version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scope": "available_assets_only" if arguments.available else "complete_collection",
        "status": "failed" if failed else "partial" if arguments.available and missing else "passed_with_review_notes" if review_count else "passed",
        "complete_collection": not missing,
        "assets_passed": passed, "assets_failed": failed, "review_note_count": review_count,
        "missing_assets": missing, "elapsed_seconds": finite_float(time.perf_counter() - started, 2),
        "ffmpeg_executable": ffmpeg, "motion_contact_sheet": str(contact_path),
        "methods": {
            "stills": "PNG structure verification, full raster decode, dimensions, opaque alpha, finite Rec.709-weighted luminance histogram, matte-relative coverage and highlight statistics.",
            "movies": "Independent original-resolution FFmpeg error-checked decode, then all decoded frames at 360 square without frame-rate conversion, exact counted frames, codec/range/color/fps/duration metadata and manifest checks.",
            "continuity": "Compare the actual last and first decoded frames with every ordinary consecutive-frame pair; report raw MAE and MAE after a 2-code-value noise deadband. Seam ratios are inspection aids, not mathematical proofs.",
            "contact_sheet": "Frames nearest normalized phases 0, 0.25, 0.5 and 0.75; actual frame indices and phases appear in each movie record.",
            "coverage_threshold": "A pixel is nonbackground when any RGB channel differs by more than 8 code values from the median of four 24-pixel corner patches.",
        },
        "scenes": results,
    }
    temporary = report_path.with_name(report_path.stem + ".tmp.json")
    temporary.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(report_path)
    print(f"\n{report['status']}: {passed} assets passed, {failed} failed, {review_count} review notes.")
    print(f"Report: {report_path}\nContact sheet: {contact_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
