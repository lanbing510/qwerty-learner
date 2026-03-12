// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomDictChapter {
    pub id: String,
    pub name: String,
    pub words: Vec<Word>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Word {
    pub word: String,
    #[serde(rename = "trans")]
    pub trans: Option<String>,
    #[serde(rename = "phonetic")]
    pub phonetic: Option<String>,
    #[serde(rename = "definition")]
    pub definition: Option<String>,
    #[serde(rename = "sentence")]
    pub sentence: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomDictionary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language: String,
    pub language_category: String,
    pub chapters: Vec<CustomDictChapter>,
    pub created_at: u64,
    pub updated_at: u64,
}

const CUSTOM_DICTS_FILENAME: &str = "custom_dictionaries.json";

fn get_custom_dicts_path() -> Option<PathBuf> {
    let app_data_dir = app_data_dir(tauri::Config::default());
    if let Some(dir) = app_data_dir {
        let custom_dicts_dir = dir.join("custom_dicts");
        if !custom_dicts_dir.exists() {
            let _ = fs::create_dir_all(&custom_dicts_dir);
        }
        Some(custom_dicts_dir.join(CUSTOM_DICTS_FILENAME))
    } else {
        None
    }
}

#[tauri::command]
fn load_custom_dicts() -> Result<Vec<CustomDictionary>, String> {
    match get_custom_dicts_path() {
        Some(path) => {
            if path.exists() {
                let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let dicts: Vec<CustomDictionary> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
                Ok(dicts)
            } else {
                Ok(vec![])
            }
        }
        None => Err("Failed to get app data directory".to_string()),
    }
}

#[tauri::command]
fn save_custom_dicts(dicts: Vec<CustomDictionary>) -> Result<(), String> {
    match get_custom_dicts_path() {
        Some(path) => {
            let content = serde_json::to_string_pretty(&dicts).map_err(|e| e.to_string())?;
            fs::write(&path, content).map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("Failed to get app data directory".to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_custom_dicts, save_custom_dicts])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
