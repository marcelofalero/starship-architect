import json
import collections

def main():
    try:
        with open('data.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: data.json not found.")
        return

    equipment = data.get('EQUIPMENT', [])

    # Organize data
    # Structure: categories[category_name][group_name] = [items]
    categories = collections.defaultdict(lambda: collections.defaultdict(list))

    for item in equipment:
        category = item.get('category', 'Uncategorized')
        group = item.get('group', 'Uncategorized')
        categories[category][group].append(item)

    # Generate Markdown
    lines = []
    lines.append("# Starship Components Report")
    lines.append("")
    lines.append("This report lists all starship components defined in `data.json`, grouped by category and group.")
    lines.append("")

    # Sort categories
    sorted_categories = sorted(categories.keys())

    for cat in sorted_categories:
        lines.append(f"## {cat}")
        lines.append("")

        # Sort groups within category
        groups = categories[cat]
        sorted_groups = sorted(groups.keys())

        for grp in sorted_groups:
            lines.append(f"### {grp}")
            lines.append("")

            items = groups[grp]
            # Sort items by Exclusive Group (treating None as empty string for sorting), then by Name
            items.sort(key=lambda x: (x.get('exclusiveGroup', '') or '', x.get('name', '')))

            # Create table
            lines.append("| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |")
            lines.append("|---|---|---|---|---|---|---|")

            for item in items:
                name = item.get('name', 'Unknown')
                base_cost = item.get('baseCost', 0)
                base_ep = item.get('baseEp', 0)
                size_mult = "Yes" if item.get('sizeMult') else "No"
                avail = item.get('availability', '')
                exclusive = item.get('exclusiveGroup', '-')
                if exclusive is None:
                    exclusive = '-'

                # Notes: description, damage, special stats
                notes = []
                if 'damage' in item:
                    notes.append(f"**Damage:** {item['damage']}")
                if 'stats' in item and item['stats']:
                    stats_list = []
                    for k, v in item['stats'].items():
                        stats_list.append(f"{k}: {v}")
                    stats_str = ", ".join(stats_list)
                    notes.append(f"**Stats:** {stats_str}")
                if 'description' in item:
                    # Truncate or clean description for table - replace newlines with spaces
                    desc = item['description'].replace('\n', ' ')
                    notes.append(desc)

                notes_str = "<br>".join(notes) if notes else ""

                # Format numbers
                try:
                    cost_str = f"{base_cost:,}"
                except ValueError:
                    cost_str = str(base_cost)

                row = f"| {name} | {cost_str} | {base_ep} | {size_mult} | {avail} | {exclusive} | {notes_str} |"
                lines.append(row)

            lines.append("")

    with open('COMPONENTS_REPORT.md', 'w') as f:
        f.write('\n'.join(lines))

    print("Report generated: COMPONENTS_REPORT.md")

if __name__ == "__main__":
    main()
