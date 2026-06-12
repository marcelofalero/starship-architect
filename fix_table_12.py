import re

with open("warships-rules/weapons-defenses.md", "r", encoding="utf-8") as f:
    content = f.read()

# Replace each bad row
bad_good_map = {
    "| Cable Gun | S | 2 | 1 $150 K +1 | 0 | -- | Special | F |": "| Cable Gun | S | 2 | 1 | $150 K | +1 | 0 | -- | Special | F |",
    "| RF Spike | - | 3 | 6 $500 K | -2 | 1/2/3 En/SH 3d4s/3d6s/2d4w**** | F |": "| RF Spike | - | 3 | 6 | $500 K | -2 | 1/2/3 | En/SH | 3d4s/3d6s/2d4w | F |",
    "| Thermal Inducer | X | 8 | 12 | $4 M +3@ 2/4/6 En/M | d6w/d6+1w/d6m | F |": "| Thermal Inducer | X | 8 | 12 | $4 M | +3 | 2/4/6 | En/M | d6w/d6+1w/d6m | F |",
    "| Thermal Nullifier | X | 15 | 20 $35 M +3@ 2/4/6 En/M | d6+3w/d6+4w/d6+2m F |": "| Thermal Nullifier | X | 15 | 20 | $35 M | +3 | 2/4/6 | En/M | d6+3w/d6+4w/d6+2m | F |",
    "| Tractor Beam | G | 2 | 5 $500 K | -1 | 2/4/8 -- | Special | F |": "| Tractor Beam | G | 2 | 5 | $500 K | -1 | 2/4/8 | -- | Special | F |",
    "| Mass Converter | M | 4 | 6 | $1 M | -4 | 2/4/6 En/S | d6+3s/d6+3w/d6+2m | F |": "| Mass Converter | M | 4 | 6 | $1 M | -4 | 2/4/6 | En/S | d6+3s/d6+3w/d6+2m | F |",
    "| Matter Torpedo | D | 5 | 7 $600 K | 0 | 2/4/8 En/M | 2d6s/2d6w/d6+3m | F |": "| Matter Torpedo | D | 5 | 7 | $600 K | 0 | 2/4/8 | En/M | 2d6s/2d6w/d6+3m | F |",
    "| Plasma Torpedo | F | 10 | 15 $10 M | +1 | 3/6/9 En/H | 3d6s/3d6w/d8+3m | F |": "| Plasma Torpedo | F | 10 | 15 | $10 M | +1 | 3/6/9 | En/H | 3d6s/3d6w/d8+3m | F |",
    "| EM Torpedo | Q | 3 | 5 $450 K | -2 | 2/5/10 En/M | d6+3s/2d8s/d4+2w | F |": "| EM Torpedo | Q | 3 | 5 | $450 K | -2 | 2/5/10 | En/M | d6+3s/2d8s/d4+2w | F |",
    "| Neural Inhibitor | P | 12 | 20 $40 M | 0 | 1/2/3 ** | 1d12s/1d12w/1d20w** | F |": "| Neural Inhibitor | P | 12 | 20 | $40 M | 0 | 1/2/3 | ** | 1d12s/1d12w/1d20w | F |",
    "| Fission Activator | M | 25 | 75 $80 M | 0 | 4/8/12 En/H | 2d4m/2d4+2m/3d4+2c F |": "| Fission Activator | M | 25 | 75 | $80 M | 0 | 4/8/12 | En/H | 2d4m/2d4+2m/3d4+2c | F |",
    "| Boarding Transporter | T | 6 | 9 | $10 M | -- | 4/6/8 -- | Special | F |": "| Boarding Transporter | T | 6 | 9 | $10 M | -- | 4/6/8 | -- | Special | F |",
    "| Null Torpedo | X | 18 | 25 $50 M | +2 | 3/6/15 En/SH 2d8w/2d8m/2d8c | F |": "| Null Torpedo | X | 18 | 25 | $50 M | +2 | 3/6/15 | En/SH | 2d8w/2d8m/2d8c | F |",
}

for bad, good in bad_good_map.items():
    content = content.replace(bad, good)

with open("warships-rules/weapons-defenses.md", "w", encoding="utf-8") as f:
    f.write(content)

