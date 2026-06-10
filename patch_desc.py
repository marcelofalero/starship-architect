with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """            if (instance.location) {
                parts.push('Location: ' + instance.location);
            }
            if (def.category === 'Systems') {
                let qty = instance.modifications?.quantity || 1;
                if (def.stats?.facility_capacity) parts.push(`Supports: ${def.stats.facility_capacity * qty} people`);
                else if (def.stats?.berthing_capacity) parts.push(`Beds: ${def.stats.berthing_capacity * qty}`);
                else if (def.stats?.passenger_capacity) parts.push(`Seats: ${def.stats.passenger_capacity * qty}`);
                else if (def.stats?.life_support_hull) parts.push(`Coverage: ${def.stats.life_support_hull * qty} Hull`);
                else if (def.stats?.stores_days) parts.push(`Stores: +${def.stats.stores_days * qty} days`);
                else if (def.stats?.hydroponics_reduction) parts.push(`Hydroponics: -${def.stats.hydroponics_reduction * qty} Cons./day`);
                else if (def.stats?.recycler_capacity) parts.push(`Recycles: ${def.stats.recycler_capacity * qty} people (10%)`);
            }"""

content = content.replace("""            if (instance.location) {
                parts.push('Location: ' + instance.location);
            }""", patch)

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
