import { store } from './store.js';

export async function loadHexDictionary() {
    try {
        const savedDict = localStorage.getItem('vergeMapHexDict');
        if (savedDict) {
            store.state.hexDict = JSON.parse(savedDict);
        } else {
            const response = await fetch('hex_dictionary.json');
            if (response.ok) {
                store.state.hexDict = await response.json();
                store.saveHexDict();
            }
        }
    } catch (e) {
        console.error("Failed to load hex dictionary", e);
    }
}

export function initDictionaryEditor() {
    const editBtn = document.getElementById('edit-dict-btn');
    const closeBtn = document.getElementById('close-dict-btn');
    const saveBtn = document.getElementById('save-dict-btn');
    const modal = document.getElementById('dict-editor-modal');
    
    const tabFactions = document.getElementById('dict-tab-factions');
    const tabFeatures = document.getElementById('dict-tab-features');
    const viewFactions = document.getElementById('dict-factions-view');
    const viewFeatures = document.getElementById('dict-features-view');
    
    const factionSelect = document.getElementById('dict-faction-select');
    const featureSelect = document.getElementById('dict-feature-select');
    const tabSpecializations = document.getElementById('dict-tab-specializations');
    const viewSpecializations = document.getElementById('dict-specializations-view');
    const specializationSelect = document.getElementById('dict-specialization-select');
    
    if (!editBtn) return;
    
    editBtn.addEventListener('click', () => {
        populateDictionaryEditor();
        modal.style.display = 'flex';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    tabFactions.addEventListener('click', () => {
        tabFactions.classList.add('active');
        tabFeatures.classList.remove('active');
        tabSpecializations.classList.remove('active');
        viewFactions.style.display = 'block';
        viewFeatures.style.display = 'none';
        viewSpecializations.style.display = 'none';
    });
    
    tabFeatures.addEventListener('click', () => {
        tabFeatures.classList.add('active');
        tabFactions.classList.remove('active');
        tabSpecializations.classList.remove('active');
        viewFeatures.style.display = 'block';
        viewFactions.style.display = 'none';
        viewSpecializations.style.display = 'none';
    });
    
    tabSpecializations.addEventListener('click', () => {
        tabSpecializations.classList.add('active');
        tabFactions.classList.remove('active');
        tabFeatures.classList.remove('active');
        viewSpecializations.style.display = 'block';
        viewFactions.style.display = 'none';
        viewFeatures.style.display = 'none';
    });
    
    factionSelect.addEventListener('change', () => {
        const id = factionSelect.value;
        const faction = store.state.hexDict.factions[id] || { name: '', color: '#ffffff', desc: '' };
        document.getElementById('dict-faction-name').value = faction.name || '';
        document.getElementById('dict-faction-color').value = faction.color || '#ffffff';
        document.getElementById('dict-faction-desc').value = faction.desc || '';
    });
    
    featureSelect.addEventListener('change', () => {
        const id = featureSelect.value;
        const feature = store.state.hexDict.features[id] || { name: '', icon: '', desc: '' };
        document.getElementById('dict-feature-name').value = feature.name || '';
        document.getElementById('dict-feature-icon').value = feature.icon || '';
        document.getElementById('dict-feature-desc').value = feature.desc || '';
    });
    
    specializationSelect.addEventListener('change', () => {
        const id = specializationSelect.value;
        const spec = store.state.hexDict.specializations && store.state.hexDict.specializations[id] || { name: '', desc: '' };
        document.getElementById('dict-specialization-name').value = spec.name || '';
        document.getElementById('dict-specialization-desc').value = spec.desc || '';
    });

    saveBtn.addEventListener('click', () => {
        const factId = factionSelect.value;
        if (factId) {
            if (!store.state.hexDict.factions) store.state.hexDict.factions = {};
            store.state.hexDict.factions[factId] = {
                name: document.getElementById('dict-faction-name').value,
                color: document.getElementById('dict-faction-color').value,
                desc: document.getElementById('dict-faction-desc').value
            };
        }
        
        const featId = featureSelect.value;
        if (featId) {
            if (!store.state.hexDict.features) store.state.hexDict.features = {};
            store.state.hexDict.features[featId] = {
                name: document.getElementById('dict-feature-name').value,
                icon: document.getElementById('dict-feature-icon').value,
                desc: document.getElementById('dict-feature-desc').value
            };
        }
        
        const specId = specializationSelect.value;
        if (specId) {
            if (!store.state.hexDict.specializations) store.state.hexDict.specializations = {};
            store.state.hexDict.specializations[specId] = {
                name: document.getElementById('dict-specialization-name').value,
                desc: document.getElementById('dict-specialization-desc').value
            };
        }
        store.saveHexDict();
        alert("Dictionary saved locally!");
        populateDictionaryEditor(); // Refresh select names
    });
}

function populateDictionaryEditor() {
    const factionSelect = document.getElementById('dict-faction-select');
    const featureSelect = document.getElementById('dict-feature-select');
    const tabSpecializations = document.getElementById('dict-tab-specializations');
    const viewSpecializations = document.getElementById('dict-specializations-view');
    const specializationSelect = document.getElementById('dict-specialization-select');
    
    const currFact = factionSelect.value;
    const currFeat = featureSelect.value;
    
    factionSelect.innerHTML = '';
    for (let i = 0; i <= 63; i++) {
        const f = store.state.hexDict.factions && store.state.hexDict.factions[i];
        const name = f && f.name ? f.name : `Unnamed Faction`;
        factionSelect.innerHTML += `<option value="${i}">[${i}] ${name}</option>`;
    }
    
    featureSelect.innerHTML = '';
    for (let i = 0; i <= 31; i++) {
        const f = store.state.hexDict.features && store.state.hexDict.features[i];
        const name = f && f.name ? f.name : `Unnamed Feature`;
        featureSelect.innerHTML += `<option value="${i}">[${i}] ${name}</option>`;
    }
    
    const currSpec = specializationSelect.value;
    
    specializationSelect.innerHTML = '';
    for (let i = 0; i <= 15; i++) {
        const s = store.state.hexDict.specializations && store.state.hexDict.specializations[i];
        const name = s && s.name ? s.name : 'Unnamed Specialization';
        specializationSelect.innerHTML += '<option value="' + i + '">[' + i + '] ' + name + '</option>';
    }

    if (currFact) factionSelect.value = currFact;
    else factionSelect.value = "0";
    
    if (currFeat) featureSelect.value = currFeat;
    else featureSelect.value = "0";
    
    factionSelect.dispatchEvent(new Event('change'));
    featureSelect.dispatchEvent(new Event('change'));
    if (currSpec) specializationSelect.value = currSpec;
    else specializationSelect.value = "0";
    
    specializationSelect.dispatchEvent(new Event('change'));
}
