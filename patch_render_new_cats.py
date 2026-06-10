import re

with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

patch_hull = """            <div v-if="store.hullUsageDetails.weapons" class="row justify-between text-grey-4"><span>Weapons</span><span>-{{ store.hullUsageDetails.weapons }}</span></div>
            <div v-if="store.hullUsageDetails.command" class="row justify-between text-grey-4"><span>Command</span><span>-{{ store.hullUsageDetails.command }}</span></div>
            <div v-if="store.hullUsageDetails.computers" class="row justify-between text-grey-4"><span>Computers</span><span>-{{ store.hullUsageDetails.computers }}</span></div>
            <div v-if="store.hullUsageDetails.sensors" class="row justify-between text-grey-4"><span>Sensors</span><span>-{{ store.hullUsageDetails.sensors }}</span></div>
            <div v-if="store.hullUsageDetails.accommodations" class="row justify-between text-grey-4"><span>Accommodations</span><span>-{{ store.hullUsageDetails.accommodations }}</span></div>
            <div v-if="store.hullUsageDetails.miscellaneous" class="row justify-between text-grey-4"><span>Miscellaneous</span><span>-{{ store.hullUsageDetails.miscellaneous }}</span></div>"""

patch_power = """            <div v-if="store.powerUsageDetails.weapons" class="row justify-between text-grey-4"><span>Weapons</span><span>-{{ store.powerUsageDetails.weapons }}</span></div>
            <div v-if="store.powerUsageDetails.command" class="row justify-between text-grey-4"><span>Command</span><span>-{{ store.powerUsageDetails.command }}</span></div>
            <div v-if="store.powerUsageDetails.computers" class="row justify-between text-grey-4"><span>Computers</span><span>-{{ store.powerUsageDetails.computers }}</span></div>
            <div v-if="store.powerUsageDetails.sensors" class="row justify-between text-grey-4"><span>Sensors</span><span>-{{ store.powerUsageDetails.sensors }}</span></div>
            <div v-if="store.powerUsageDetails.accommodations" class="row justify-between text-grey-4"><span>Accommodations</span><span>-{{ store.powerUsageDetails.accommodations }}</span></div>
            <div v-if="store.powerUsageDetails.miscellaneous" class="row justify-between text-grey-4"><span>Miscellaneous</span><span>-{{ store.powerUsageDetails.miscellaneous }}</span></div>"""

content = re.sub(r'            <div v-if="store\.hullUsageDetails\.weapons".*?<span>-\{\{ store\.hullUsageDetails\.miscellaneous \}\}<\/span><\/div>', patch_hull, content, flags=re.DOTALL)
content = re.sub(r'            <div v-if="store\.powerUsageDetails\.weapons".*?<span>-\{\{ store\.powerUsageDetails\.miscellaneous \}\}<\/span><\/div>', patch_power, content, flags=re.DOTALL)

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
