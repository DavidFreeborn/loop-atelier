"""Compare smaller symmetric Gauss–Legendre rules at final Caustic controls."""
import json
from pathlib import Path
import numpy as np
from numpy.polynomial.legendre import leggauss

sizes = [64, 96, 128, 160, 192, 224, 256, 512]
rules = {}
for size in sizes:
    nodes, weights = leggauss(size)
    nodes = 1.7*nodes[size//2:]
    weights = 2*1.7*weights[size//2:]*(.5+.5*np.cos(np.pi*nodes/1.7))
    rules[size] = (nodes, weights)
for size in [128, 160, 192, 224, 256]:
    nodes = -1.7+(np.arange(size//2, size)+.5)*3.4/size
    weights = 2*(.5+.5*np.cos(np.pi*nodes/1.7))*3.4/size
    rules[f'midpoint-{size}'] = (nodes, weights)
candidate_sizes = [size for size in rules if size != 512]
points = np.array(np.meshgrid(np.linspace(-1, 1, 19), np.linspace(-1, 1, 19))).reshape(2, -1).T
summary = {size: {'maximum': 0., 'squared': 0., 'count': 0} for size in candidate_sizes}
for variation in [0, .5, 1]:
    for phase in np.arange(24)/24:
        t = 2*np.pi*phase
        seed = .29*np.sin(601.1037519201636*.021)
        turn = .22*np.sin(t+seed)
        co, si = np.cos(turn), np.sin(turn)
        z = points @ np.array([[co, si], [-si, co]])
        z = z[:, 0] + 1j*z[:, 1]
        mapped = 1.35*z**3 - (.55+.18*np.cos(t))*np.exp(.5j*np.sin(t))*z
        q = 1.45*np.tanh(.9*np.column_stack([mapped.real, mapped.imag]))
        separation, bend = .54+.32*np.cos(t), .16+.18*variation
        first = np.array([2.7*(q[:, 0]-separation)-.78, 3.15*q[:, 1]+.58*np.sin(t+.3)+bend*q[:, 0]**2]).T
        second = np.array([-2.7*(q[:, 0]+separation)-.78, 3.15*q[:, 1]-.58*np.sin(t+.3)-bend*q[:, 0]**2]).T
        k = 16+8*variation
        for xy in [first, second]:
            def integrate(size):
                nodes, weights = rules[size]
                even = k*(nodes[None, :]**4/4 + xy[:, 0, None]*nodes[None, :]**2/2)
                odd = k*xy[:, 1, None]*nodes[None, :]
                return (np.exp(1j*even)*np.cos(odd)) @ weights
            reference = integrate(512)
            for size in candidate_sizes:
                difference = np.abs(integrate(size)-reference)
                record = summary[size]
                record['maximum'] = max(record['maximum'], float(difference.max()))
                record['squared'] += float(np.sum(difference*difference))
                record['count'] += len(difference)
results = [{'rule': str(size) if isinstance(size, str) else f'gauss-{size}', 'symmetric_pairs': len(rules[size][0]),
            'maximum_complex_amplitude_error': r['maximum'],
            'rms_complex_amplitude_error': (r['squared']/r['count'])**.5,
            'controls': r['count']} for size, r in summary.items()]
out = Path('output/qa/03/caustic')
(out/'quadrature-comparison.json').write_text(json.dumps(results, indent=2)+'\n')
(out/'quadrature-rules.json').write_text(json.dumps({str(size): {'nodes': n.tolist(), 'weights': w.tolist()} for size, (n, w) in rules.items() if size!=512}, indent=2)+'\n')
print(json.dumps(results, indent=2))
