# Taiga Ticket Management Skill

Whenever you are asked to manage Taiga tickets (e.g., list, show, create, assign, close, comment), you should use the custom Rust CLI tool `taiga` installed in `~/.local/bin/taiga`.

Do NOT use the old bash scripts (`create_ticket.sh`, `manage_ticket.sh`) as they are deprecated.

---

## Configuration

Credentials and configuration parameters are loaded from the `.taiga` file. The CLI recursively searches for the `.taiga` file starting from the current working directory upwards through parent folders.

A `.taiga` file looks like this:
```env
TAIGA_URL=https://api.taiga.io
TAIGA_USERNAME=username@domain.com
TAIGA_PASSWORD=your_password
TAIGA_PROJECT_ID=1798624
```

---

## Commands & Usage

### 1. Listing Tickets
To list open tickets:
```bash
taiga list
```
To list all tickets (including closed/done ones):
```bash
taiga list --all
```

### 2. Viewing Tickets (Batch Support)
To view details (description, status, comment history) of one or more tickets:
```bash
taiga show <ref_num_1> [ref_num_2] ...
```
Example:
```bash
taiga show 24 25
```

### 3. Creating Tickets
To create new tickets (optional description with `--desc`):
```bash
taiga create "Ticket Subject" --desc "Ticket Description"
```
To create multiple tickets at once:
```bash
taiga create "Subject A" "Subject B"
```

### 4. Assigning Tickets (Batch Support)
To assign one or more tickets to yourself:
```bash
taiga assign <ref_num_1> [ref_num_2] ...
```
Example:
```bash
taiga assign 24 25
```

### 5. Closing Tickets (Batch Support)
To close (mark as Done) one or more tickets:
```bash
taiga close <ref_num_1> [ref_num_2] ...
```
Example:
```bash
taiga close 24 25
```

### 6. Commenting on Tickets (Batch Support)
To add a comment to one or more tickets:
```bash
taiga comment <ref_num_1> [ref_num_2] ... -m "Your comment message"
```
Example:
```bash
taiga comment 24 25 -m "Working on implementing Stage 4 refactoring today"
```
