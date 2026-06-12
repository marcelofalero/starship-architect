import re

with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.auxiliary" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.auxiliary" label="Auxiliary Command Deck (x2 Cost and Hull Points)" />
                    </div>
                    <div v-for="opt in getGenericOptions(editingInstance.defId)"""

content = content.replace('                    <div v-for="opt in getGenericOptions(editingInstance.defId)', patch)

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
