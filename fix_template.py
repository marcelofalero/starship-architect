with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

# We want to replace everything from `<!-- Search Bar -->` to the end of the `<!-- Form Elements -->` div.
start_str = "                <!-- Search Bar -->"
end_str = "                </div>\n\n                <div class=\"q-mb-md\">"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    new_block = """                <!-- Smart Search Bar -->
                <div class="q-mb-md row items-center">
                    <div class="col-grow">
                        <q-select
                            filled dark
                            v-model="searchTags"
                            use-input
                            use-chips
                            multiple
                            hide-dropdown-icon
                            input-debounce="0"
                            new-value-mode="add-unique"
                            :label="$t('ui.search_component')"
                            hint="Filter by Category, Type, PL, or search by name"
                            :options="searchTagOptions"
                            @filter="filterSearchTags"
                            @update:model-value="newComponentSelection = null"
                            clearable
                        >
                            <template v-slot:prepend><q-icon name="search" /></template>
                        </q-select>
                    </div>
                </div>\n"""
    
    content = content.replace(old_block, new_block)
    
    with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Template replaced successfully.")
else:
    print("Failed to find boundaries.")
