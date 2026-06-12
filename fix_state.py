with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Block 1: The old state variables up to itemOptions
start_str = "        const newComponentCategory = ref(null);"
end_str = "        // Computes available items based on ALL selected filters\n        const itemOptions = computed(() => {"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    new_block = """        const searchTags = ref([]);
        const newComponentSelection = ref(null);
        const searchTagOptions = ref([]);

        const resetSelections = () => {
            searchTags.value = [];
            newComponentSelection.value = null;
        };

        const allAvailableTags = computed(() => {
            const tags = new Set();
            for (const e of store.allEquipment) {
                if (e.category) tags.add(`Category: ${e.category}`);
                if (e.group) tags.add(`Type: ${e.group}`);
                if (e.stats?.pl) tags.add(`PL: ${e.stats.pl}`);
            }
            return Array.from(tags).sort();
        });

        const filterSearchTags = (val, update) => {
            if (val === '') {
                update(() => {
                    searchTagOptions.value = allAvailableTags.value;
                });
                return;
            }
            update(() => {
                const needle = val.toLowerCase();
                searchTagOptions.value = allAvailableTags.value.filter(v => v.toLowerCase().includes(needle));
            });
        };

        const filteredEquipmentPool = computed(() => {
            return store.allEquipment.filter(e => {
                if (!searchTags.value.length) return true;
                
                for (const tag of searchTags.value) {
                    if (tag.startsWith("Category: ")) {
                        const val = tag.replace("Category: ", "");
                        if (e.category !== val) return false;
                    } else if (tag.startsWith("Type: ")) {
                        const val = tag.replace("Type: ", "");
                        if (e.group !== val) return false;
                    } else if (tag.startsWith("PL: ")) {
                        const val = tag.replace("PL: ", "");
                        if (e.stats?.pl !== val) return false;
                    } else {
                        const needle = tag.toLowerCase();
                        const nameMatch = getLocalizedName(e).toLowerCase().includes(needle);
                        const descMatch = e.description && e.description.toLowerCase().includes(needle);
                        if (!nameMatch && !descMatch) return false;
                    }
                }
                return true;
            });
        });

"""
    
    content = content.replace(old_block, new_block)
    print("State replaced successfully.")
else:
    print("Failed to find boundaries.")

# Block 2: The old return statement
ret_start = "        return { store, newComponentCategory"
ret_end = "        };"

ret_start_idx = content.find(ret_start)
ret_end_idx = content.find(ret_end, ret_start_idx)

if ret_start_idx != -1 and ret_end_idx != -1:
    old_ret = content[ret_start_idx:ret_end_idx + len(ret_end)]
    
    new_ret = """        return { store, searchTags, searchTagOptions, filterSearchTags, newComponentSelection, itemOptions, selectedItemDef, isSizeValid, checkRequirements, previewCost, previewHullPts, resetSelections, formatCreds, installComponent, getLocalizedName,
            showJsonEditor, jsonContent, openWiki, openJsonEditor, saveJson, createNew, deleteComponent
        };"""
    
    content = content.replace(old_ret, new_ret)
    print("Return block replaced successfully.")
else:
    print("Failed to find return boundaries.")

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
