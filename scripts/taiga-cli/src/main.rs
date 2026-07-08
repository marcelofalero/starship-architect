use std::collections::HashMap;
use std::env;
use std::path::PathBuf;
use std::process;
use clap::{Parser, Subcommand};
use colored::*;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

#[derive(Parser)]
#[command(name = "taiga")]
#[command(about = "A custom CLI tool for Taiga.io with batch support", long_about = None)]
struct Cli {
    #[arg(short, long, help = "Specify the Taiga project ID")]
    project_id: Option<u32>,

    #[arg(short, long, help = "Silence info logging")]
    quiet: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(name = "list", aliases = &["ls"], about = "List user stories")]
    List {
        #[arg(short, long, help = "Show all stories (including closed ones)")]
        all: bool,
    },
    #[command(name = "show", aliases = &["view"], about = "View details of one or more user stories")]
    Show {
        #[arg(required = true, help = "Reference numbers of the user stories")]
        refs: Vec<u32>,
    },
    #[command(name = "create", aliases = &["new"], about = "Create one or more user stories")]
    Create {
        #[arg(required = true, help = "Subjects of the user stories to create")]
        subjects: Vec<String>,

        #[arg(short, long, help = "Optional description (applies to the created stories)")]
        desc: Option<String>,
    },
    #[command(name = "assign", about = "Assign one or more user stories to yourself")]
    Assign {
        #[arg(required = true, help = "Reference numbers of the user stories")]
        refs: Vec<u32>,
    },
    #[command(name = "close", aliases = &["done"], about = "Close one or more user stories")]
    Close {
        #[arg(required = true, help = "Reference numbers of the user stories")]
        refs: Vec<u32>,
    },
    #[command(name = "comment", about = "Add a comment to one or more user stories")]
    Comment {
        #[arg(required = true, help = "Reference numbers of the user stories")]
        refs: Vec<u32>,

        #[arg(short, long, required = true, help = "The comment text to add")]
        message: String,
    },
}

#[derive(Deserialize, Debug)]
struct AuthResponse {
    auth_token: String,
}

#[derive(Deserialize, Debug)]
struct UserInfo {
    id: u32,
    full_name_display: String,
}

#[derive(Deserialize, Debug)]
struct UserStoryStatus {
    id: u32,
    name: String,
    is_closed: bool,
}

#[derive(Deserialize, Debug)]
struct UserStoryFields {
    id: u32,
    #[serde(rename = "ref")]
    ref_num: u32,
    subject: String,
    description: Option<String>,
    status: u32,
    is_closed: bool,
    version: u32,
    created_date: String,
    assigned_to_extra_info: Option<UserStoryAssignedToInfo>,
    owner_extra_info: Option<UserStoryOwnerInfo>,
}

#[derive(Deserialize, Debug)]
struct UserStoryAssignedToInfo {
    full_name_display: String,
}

#[derive(Deserialize, Debug)]
struct UserStoryOwnerInfo {
    full_name_display: String,
}

#[derive(Deserialize, Debug)]
struct HistoryItem {
    comment: Option<String>,
    created_at: String,
    user: HistoryUser,
}

#[derive(Deserialize, Debug)]
struct HistoryUser {
    name: String,
}

#[derive(Serialize)]
struct CreateUserStoryPayload<'a> {
    project: u32,
    subject: &'a str,
    description: &'a str,
}

#[derive(Serialize)]
struct UpdateUserStoryPayload<'a> {
    version: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    assigned_to: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    comment: Option<&'a str>,
}

struct TaigaClient {
    client: Client,
    base_url: String,
    token: String,
    project_id: u32,
}

impl TaigaClient {
    fn new(base_url: String, token: String, project_id: u32) -> Self {
        Self {
            client: Client::new(),
            base_url,
            token,
            project_id,
        }
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::AUTHORIZATION,
            reqwest::header::HeaderValue::from_str(&format!("Bearer {}", self.token)).unwrap(),
        );
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            reqwest::header::HeaderValue::from_static("application/json"),
        );
        headers
    }

    fn get_statuses(&self) -> HashMap<u32, UserStoryStatus> {
        let url = format!("{}/api/v1/userstory-statuses?project={}", self.base_url, self.project_id);
        let res = self.client.get(&url).headers(self.headers()).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    eprintln!("{}: {}", "Failed to fetch statuses".red(), response.text().unwrap_or_default());
                    process::exit(1);
                }
                let statuses: Vec<UserStoryStatus> = response.json().unwrap_or_else(|e| {
                    eprintln!("{}: {}", "JSON Parse error".red(), e);
                    process::exit(1);
                });
                statuses.into_iter().map(|s| (s.id, s)).collect()
            }
            Err(e) => {
                eprintln!("{}: {}", "Network error".red(), e);
                process::exit(1);
            }
        }
    }

    fn get_me(&self) -> UserInfo {
        let url = format!("{}/api/v1/users/me", self.base_url);
        let res = self.client.get(&url).headers(self.headers()).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    eprintln!("{}: {}", "Failed to fetch user profile".red(), response.text().unwrap_or_default());
                    process::exit(1);
                }
                response.json().unwrap_or_else(|e| {
                    eprintln!("{}: {}", "JSON Parse error".red(), e);
                    process::exit(1);
                })
            }
            Err(e) => {
                eprintln!("{}: {}", "Network error".red(), e);
                process::exit(1);
            }
        }
    }

    fn get_story_by_ref(&self, ref_num: u32) -> Result<UserStoryFields, String> {
        let url = format!(
            "{}/api/v1/userstories/by_ref?ref={}&project={}",
            self.base_url, ref_num, self.project_id
        );
        let res = self.client.get(&url).headers(self.headers()).send();
        
        match res {
            Ok(response) => {
                if response.status() == reqwest::StatusCode::NOT_FOUND {
                    return Err(format!("User story Ref #{} not found", ref_num));
                }
                if !response.status().is_success() {
                    return Err(response.text().unwrap_or_else(|_| "Unknown error".to_string()));
                }
                response.json::<UserStoryFields>().map_err(|e| format!("JSON Parse error: {}", e))
            }
            Err(e) => Err(format!("Network error: {}", e)),
        }
    }

    fn get_history(&self, story_id: u32) -> Vec<HistoryItem> {
        let url = format!("{}/api/v1/history/userstory/{}", self.base_url, story_id);
        let res = self.client.get(&url).headers(self.headers()).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    return vec![];
                }
                response.json::<Vec<HistoryItem>>().unwrap_or_default()
            }
            Err(_) => vec![],
        }
    }

    fn list_stories(&self, show_all: bool) {
        let url = format!("{}/api/v1/userstories?project={}", self.base_url, self.project_id);
        let res = self.client.get(&url).headers(self.headers()).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    eprintln!("{}: {}", "Failed to list stories".red(), response.text().unwrap_or_default());
                    process::exit(1);
                }
                let mut stories: Vec<UserStoryFields> = response.json().unwrap_or_else(|e| {
                    eprintln!("{}: {}", "JSON Parse error".red(), e);
                    process::exit(1);
                });
                
                let statuses = self.get_statuses();
                
                // Filter out closed stories if not show_all
                if !show_all {
                    stories.retain(|s| !s.is_closed);
                }
                
                // Sort by closed state, then by ref
                stories.sort_by_key(|s| (s.is_closed, s.ref_num));
                
                println!(
                    "\n{:<6} {:<15} {:<20} {}",
                    "REF".bold().white(),
                    "STATUS".bold().white(),
                    "ASSIGNED TO".bold().white(),
                    "SUBJECT".bold().white()
                );
                println!("{}", "-".repeat(80));
                
                for s in stories {
                    let ref_str = format!("#{}", s.ref_num);
                    let status_info = statuses.get(&s.status);
                    let status_name = status_info.map(|i| i.name.as_str()).unwrap_or("Unknown");
                    
                    let assigned_name = s.assigned_to_extra_info
                        .as_ref()
                        .map(|a| a.full_name_display.as_str())
                        .unwrap_or("Unassigned");
                        
                    let status_colored = if s.is_closed {
                        status_name.green()
                    } else if status_name.to_lowercase() == "in progress" || status_name.to_lowercase() == "working" {
                        status_name.yellow()
                    } else {
                        status_name.cyan()
                    };
                    
                    println!(
                        "{:<6} {:<15} {:<20} {}",
                        ref_str.cyan(),
                        status_colored,
                        assigned_name.magenta(),
                        s.subject
                    );
                }
                println!();
            }
            Err(e) => {
                eprintln!("{}: {}", "Network error".red(), e);
                process::exit(1);
            }
        }
    }

    fn create_story(&self, subject: &str, description: &str) {
        let url = format!("{}/api/v1/userstories", self.base_url);
        let payload = CreateUserStoryPayload {
            project: self.project_id,
            subject,
            description,
        };
        
        let res = self.client.post(&url).headers(self.headers()).json(&payload).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    eprintln!("{}: {}", "Failed to create story".red(), response.text().unwrap_or_default());
                    return;
                }
                let data: serde_json::Value = response.json().unwrap();
                let ref_num = data.get("ref").and_then(|v| v.as_u64()).unwrap_or(0);
                println!(
                    "{} Created User Story {} - {}",
                    "Success!".green().bold(),
                    format!("#{}", ref_num).cyan(),
                    subject
                );
            }
            Err(e) => {
                eprintln!("{} Failed to create story '{}': {}", "Error:".red(), subject, e);
            }
        }
    }

    fn show_stories(&self, refs: &[u32]) {
        let statuses = self.get_statuses();
        for &ref_num in refs {
            match self.get_story_by_ref(ref_num) {
                Ok(story) => {
                    let status_info = statuses.get(&story.status);
                    let status_name = status_info.map(|i| i.name.as_str()).unwrap_or("Unknown");
                    
                    let assigned_name = story.assigned_to_extra_info
                        .as_ref()
                        .map(|a| a.full_name_display.as_str())
                        .unwrap_or("Unassigned");
                        
                    println!(
                        "\n{} {} - {}",
                        "User Story".bold().white(),
                        format!("#{}", story.ref_num).cyan().bold(),
                        story.subject.bold().white()
                    );
                    println!("{}", "=".repeat(80));
                    
                    let status_colored = if story.is_closed {
                        status_name.green()
                    } else {
                        status_name.cyan()
                    };
                    
                    println!("{:<15} {}", "Status:".bold(), status_colored);
                    println!("{:<15} {}", "Assigned To:".bold(), assigned_name.magenta());
                    println!(
                        "{:<15} {}",
                        "Created By:".bold(),
                        story.owner_extra_info.as_ref().map(|o| o.full_name_display.as_str()).unwrap_or("Unknown")
                    );
                    println!("{:<15} {}", "Created At:".bold(), story.created_date);
                    println!("{}", "-".repeat(80));
                    println!("{}", "Description:".bold());
                    println!("{}", story.description.as_deref().unwrap_or("No description provided."));
                    println!("{}", "-".repeat(80));
                    
                    let history = self.get_history(story.id);
                    let comments: Vec<&HistoryItem> = history.iter().filter(|h| h.comment.is_some()).collect();
                    
                    if !comments.is_empty() {
                        println!("{}", "Comments:".bold());
                        for c in comments.iter().rev() {
                            println!(
                                "  {} ({}):",
                                c.user.name.yellow(),
                                c.created_at
                            );
                            println!("    {}", c.comment.as_ref().unwrap());
                            println!();
                        }
                    } else {
                        println!("No comments.");
                    }
                    println!();
                }
                Err(e) => {
                    eprintln!("{} {}", "Error:".red(), e);
                }
            }
        }
    }

    fn update_story_fields(
        &self,
        ref_num: u32,
        assigned_to: Option<u32>,
        status: Option<u32>,
        comment: Option<&str>,
    ) -> Result<(), String> {
        let story = self.get_story_by_ref(ref_num)?;
        let url = format!("{}/api/v1/userstories/{}", self.base_url, story.id);
        
        let payload = UpdateUserStoryPayload {
            version: story.version,
            assigned_to,
            status,
            comment,
        };
        
        let res = self.client.patch(&url).headers(self.headers()).json(&payload).send();
        
        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    return Err(response.text().unwrap_or_else(|_| "Failed to update".to_string()));
                }
                Ok(())
            }
            Err(e) => Err(e.to_string()),
        }
    }

    fn assign_stories(&self, refs: &[u32]) {
        let me = self.get_me();
        for &ref_num in refs {
            match self.update_story_fields(ref_num, Some(me.id), None, None) {
                Ok(_) => {
                    println!(
                        "{} Assigned User Story {} to {}.",
                        "Success!".green().bold(),
                        format!("#{}", ref_num).cyan(),
                        me.full_name_display.magenta()
                    );
                }
                Err(e) => {
                    eprintln!("{} Failed to assign Ref #{}: {}", "Error:".red(), ref_num, e);
                }
            }
        }
    }

    fn close_stories(&self, refs: &[u32]) {
        let statuses = self.get_statuses();
        let mut done_status_id = None;
        let mut done_status_name = "Done".to_string();
        
        for (&sid, info) in &statuses {
            if info.name.to_lowercase() == "done" || info.is_closed {
                done_status_id = Some(sid);
                done_status_name = info.name.clone();
                break;
            }
        }
        
        let status_id = match done_status_id {
            Some(id) => id,
            None => {
                eprintln!("{}", "Error: Could not find 'Done' or closed status in this project.".red());
                process::exit(1);
            }
        };
        
        for &ref_num in refs {
            match self.update_story_fields(ref_num, None, Some(status_id), None) {
                Ok(_) => {
                    println!(
                        "{} Closed User Story {} (Status set to {}).",
                        "Success!".green().bold(),
                        format!("#{}", ref_num).cyan(),
                        done_status_name.green()
                    );
                }
                Err(e) => {
                    eprintln!("{} Failed to close Ref #{}: {}", "Error:".red(), ref_num, e);
                }
            }
        }
    }

    fn comment_stories(&self, refs: &[u32], message: &str) {
        for &ref_num in refs {
            match self.update_story_fields(ref_num, None, None, Some(message)) {
                Ok(_) => {
                    println!(
                        "{} Added comment to User Story {}.",
                        "Success!".green().bold(),
                        format!("#{}", ref_num).cyan()
                    );
                }
                Err(e) => {
                    eprintln!("{} Failed to add comment to Ref #{}: {}", "Error:".red(), ref_num, e);
                }
            }
        }
    }
}

fn get_auth_token(base_url: &str, username: &str, password: &str) -> String {
    let client = Client::new();
    let url = format!("{}/api/v1/auth", base_url);
    
    let payload = serde_json::json!({
        "type": "normal",
        "username": username,
        "password": password
    });
    
    let res = client.post(&url).json(&payload).send();
    
    match res {
        Ok(response) => {
            if !response.status().is_success() {
                eprintln!("{}: {}", "Authentication failed".red(), response.text().unwrap_or_default());
                process::exit(1);
            }
            let auth: AuthResponse = response.json().unwrap_or_else(|e| {
                eprintln!("{}: {}", "Failed to parse auth response".red(), e);
                process::exit(1);
            });
            auth.auth_token
        }
        Err(e) => {
            eprintln!("{}: {}", "Connection failed".red(), e);
            process::exit(1);
        }
    }
}

fn load_taiga_config() -> Result<PathBuf, String> {
    let mut current_dir = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    loop {
        let candidate = current_dir.join(".taiga");
        if candidate.exists() && candidate.is_file() {
            dotenvy::from_path(&candidate).map_err(|e| format!("Failed to load config from {:?}: {}", candidate, e))?;
            return Ok(candidate);
        }
        if !current_dir.pop() {
            break;
        }
    }
    Err("Could not find '.taiga' configuration file in the current directory or any parent directories.".to_string())
}

fn main() {
    let _config_path = match load_taiga_config() {
        Ok(path) => path,
        Err(e) => {
            eprintln!("{}: {}", "Error".red(), e);
            eprintln!("Please create a '.taiga' file in your project or any parent directory containing your credentials.");
            process::exit(1);
        }
    };
    
    let cli = Cli::parse();
    
    let base_url = env::var("TAIGA_URL").unwrap_or_else(|_| "https://api.taiga.io".to_string());
    let username = match env::var("TAIGA_USERNAME") {
        Ok(u) => u,
        Err(_) => {
            eprintln!("{}", "Error: TAIGA_USERNAME not set in .taiga".red());
            process::exit(1);
        }
    };
    let password = match env::var("TAIGA_PASSWORD") {
        Ok(p) => p,
        Err(_) => {
            eprintln!("{}", "Error: TAIGA_PASSWORD not set in .taiga".red());
            process::exit(1);
        }
    };
    
    let project_id = cli.project_id
        .or_else(|| env::var("TAIGA_PROJECT_ID").ok().and_then(|id| id.parse().ok()))
        .unwrap_or(1798624);
        
    if !cli.quiet {
        // Quiet mode suppress auth message
    }
    
    let token = get_auth_token(&base_url, &username, &password);
    let taiga = TaigaClient::new(base_url, token, project_id);
    
    match cli.command {
        Commands::List { all } => {
            taiga.list_stories(all);
        }
        Commands::Show { refs } => {
            taiga.show_stories(&refs);
        }
        Commands::Create { subjects, desc } => {
            let description = desc.unwrap_or_default();
            for subject in subjects {
                taiga.create_story(&subject, &description);
            }
        }
        Commands::Assign { refs } => {
            taiga.assign_stories(&refs);
        }
        Commands::Close { refs } => {
            taiga.close_stories(&refs);
        }
        Commands::Comment { refs, message } => {
            taiga.comment_stories(&refs, &message);
        }
    }
}
