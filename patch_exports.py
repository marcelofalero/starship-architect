import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "currentPassengers, currentConsumables, totalPopulation, escapePodCapacity,",
    "currentPassengers, currentConsumables, totalPopulation, escapePodCapacity, totalBerthingCapacity, totalPassengerCapacity, totalLifeSupportCapacity,"
)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)

