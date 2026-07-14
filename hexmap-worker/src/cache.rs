use std::collections::HashMap;
use std::sync::Mutex;
use worker::{Env, Result};

static MEMORY_CACHE: Mutex<Option<HashMap<String, Vec<u8>>>> = Mutex::new(None);

fn set_in_memory(key: &str, value: Vec<u8>) {
    let mut cache_opt = MEMORY_CACHE.lock().unwrap();
    if cache_opt.is_none() {
        *cache_opt = Some(HashMap::new());
    }
    if let Some(ref mut cache) = *cache_opt {
        cache.insert(key.to_string(), value);
    }
}

fn get_in_memory(key: &str) -> Option<Vec<u8>> {
    let cache_opt = MEMORY_CACHE.lock().unwrap();
    if let Some(ref cache) = *cache_opt {
        cache.get(key).cloned()
    } else {
        None
    }
}

pub async fn get_map(env: &Env, key: &str) -> Result<Option<Vec<u8>>> {
    if let Ok(kv) = env.kv("MAP_CACHE") {
        if let Some(val) = kv.get(key).bytes().await? {
            return Ok(Some(val));
        }
    }
    Ok(get_in_memory(key))
}

pub async fn set_map(env: &Env, key: &str, value: Vec<u8>) -> Result<()> {
    if let Ok(kv) = env.kv("MAP_CACHE") {
        kv.put(key, value.clone())?.execute().await?;
    }
    set_in_memory(key, value);
    Ok(())
}
