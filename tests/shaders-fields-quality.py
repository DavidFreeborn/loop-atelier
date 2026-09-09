"""Independent numerical checks for the two original field shaders.

Run with Python + NumPy. The diffraction reference uses Gauss–Legendre nodes,
independent of the shader's midpoint quadrature. Browser tests own GLSL compile,
frame comparisons, floating-point rendering and temporal-sampling checks.
"""
import json
import numpy as np
from numpy.polynomial.legendre import leggauss


def shader_seed(recipe_seed):
    """The aggregate registry passes its first Mulberry32 value times 1000."""
    mask = 0xffffffff
    state = (recipe_seed + 0x6d2b79f5) & mask
    n = ((state ^ (state >> 15)) * (state | 1)) & mask
    n ^= (n + (((n ^ (n >> 7)) * (n | 61)) & mask)) & mask
    return ((n ^ (n >> 14)) & mask) / 4294967296 * 1000


def controls(phase, seed=42):
    t = 2 * np.pi * phase
    offset = .37 * np.sin(shader_seed(seed) * .0137)
    c = .19 * (np.cos(t + .4) + 1j * np.sin(t - .2))
    d = .29 * (np.cos(t + 2.1) + 1j * np.sin(t + 1.2))
    a = (.48 + .16 * np.cos(t + .2)) * np.exp(1j * (t + offset))
    b = (.16 + .07 * np.sin(t + .8)) * np.exp(1j * (-t + .9 + offset))
    roots = [c + abs(a)**(1 / 3) * np.exp(1j * (t + offset + 2*np.pi*j) / 3) for j in range(3)]
    roots += [d + abs(b)**.5 * np.exp(1j * (-t + .9 + offset + 2*np.pi*j) / 2) for j in range(2)]
    return c, d, a, b, np.array(roots)


minimum_root_separation = np.inf
maximum_root_residual = 0
for phase in np.arange(4000) / 4000:
    c, d, a, b, roots = controls(phase)
    maximum_root_residual = max(maximum_root_residual, float(np.max(np.abs(((roots-c)**3-a)*((roots-d)**2-b)))))
    minimum_root_separation = min(minimum_root_separation, min(abs(roots[j]-roots[k]) for j in range(5) for k in range(j)))
assert maximum_root_residual < 1e-12
for seed in [0, 42, 713]:
    start = controls(0, seed)
    end = controls(1, seed)
    assert np.max(np.abs(np.array(start[:4])-np.array(end[:4]))) < 1e-14
    # Three-cycle and two-cycle permutations; no root labels in the palette.
    assert np.max(np.abs(end[4]-start[4][[1, 2, 0, 4, 3]])) < 1e-14
    h = 1e-4
    right = (-3*np.array(start[:4])+4*np.array(controls(h, seed)[:4])-np.array(controls(2*h, seed)[:4])) / (2*h)
    left = (3*np.array(end[:4])-4*np.array(controls(1-h, seed)[:4])+np.array(controls(1-2*h, seed)[:4])) / (2*h)
    assert np.max(np.abs(right-left)) < 1e-7

s = -1.7 + (np.arange(256) + .5) * 3.4 / 256
w = (.5 + .5*np.cos(np.pi*s/1.7)) * 3.4 / 256
nodes, weights = leggauss(512)
reference_s = 1.7 * nodes
reference_w = weights * 1.7 * (.5 + .5*np.cos(np.pi*reference_s/1.7))
points = np.array(np.meshgrid(np.linspace(-1, 1, 19), np.linspace(-1, 1, 19))).reshape(2, -1).T
maximum_error = 0
squared_error = 0
sample_count = 0
for variation in [0, .5, 1]:
    for phase in np.arange(24) / 24:
        t = 2 * np.pi * phase
        seed = .29 * np.sin(shader_seed(42)*.021)
        turn = .22 * np.sin(t+seed)
        co, si = np.cos(turn), np.sin(turn)
        q = points @ np.array([[co, si], [-si, co]])
        z = q[:, 0] + 1j*q[:, 1]
        mapped = 1.35*z**3 - (.55+.18*np.cos(t))*np.exp(.5j*np.sin(t))*z
        q = 1.45*np.tanh(.9*np.column_stack([mapped.real, mapped.imag]))
        separation = .54 + .32*np.cos(t)
        bend = .16 + .18*variation
        first = np.array([2.7*(q[:, 0]-separation)-.78, 3.15*q[:, 1]+.58*np.sin(t+.3)+bend*q[:, 0]**2]).T
        second = np.array([-2.7*(q[:, 0]+separation)-.78, 3.15*q[:, 1]-.58*np.sin(t+.3)-bend*q[:, 0]**2]).T
        k = 16 + 8*variation
        for xy in [first, second]:
            def integrate(nodes, weights):
                phase = k*(nodes[None, :]**4/4 + xy[:, 0, None]*nodes[None, :]**2/2 + xy[:, 1, None]*nodes[None, :])
                return np.exp(1j*phase) @ weights
            difference = np.abs(integrate(s, w)-integrate(reference_s, reference_w))
            maximum_error = max(maximum_error, float(difference.max()))
            squared_error += float(np.sum(difference*difference))
            sample_count += len(difference)
assert maximum_error < 1e-5
print(json.dumps({
    'monodromy': {'sampled_phases': 4000, 'maximum_root_residual': maximum_root_residual,
                  'minimum_sampled_root_separation_seed42': float(minimum_root_separation),
                  'coefficient_seam_and_root_permutation': 'passed for seeds 0, 42, 713'},
    'caustic': {'reference': '512-point Gauss–Legendre', 'midpoint_nodes': 256,
                'wavefront_controls_tested': sample_count,
                'maximum_complex_amplitude_error': maximum_error,
                'rms_complex_amplitude_error': (squared_error/sample_count)**.5},
}, indent=2))
