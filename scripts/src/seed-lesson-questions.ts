import { Pool } from "pg";

const LESSON_QUESTIONS: Record<string, any[]> = {
  "The shell and the prompt": [
    { q: "What is the common shell in Linux?", options: ["bash", "cmd", "powershell", "python"], correct: 0 },
    { q: "What does the prompt '$' usually mean?", options: ["Waiting for command", "Error", "Root access", "Loading"], correct: 0 }
  ],
  "Files and navigation": [
    { q: "Which command lists directory contents?", options: ["ls", "cd", "pwd", "mkdir"], correct: 0 },
    { q: "How do you go up one level?", options: ["cd ..", "cd /", "cd ~", "cd -"], correct: 0 }
  ],
  "Reading files and permissions": [
    { q: "Which command opens a file page by page?", options: ["less", "cat", "echo", "grep"], correct: 0 },
    { q: "In permissions, what does 'r' stand for?", options: ["Read", "Run", "Remove", "Rewrite"], correct: 0 }
  ],
  "IP addresses and ports": [
    { q: "Which port is commonly used for HTTP?", options: ["80", "443", "22", "53"], correct: 0 },
    { q: "An IP address identifies what?", options: ["A machine on a network", "A specific user", "A web browser", "A hard drive"], correct: 0 }
  ],
  "TCP and UDP": [
    { q: "Which protocol confirms delivery?", options: ["TCP", "UDP", "IP", "ICMP"], correct: 0 },
    { q: "Which protocol is faster but offers no delivery guarantee?", options: ["UDP", "TCP", "HTTP", "FTP"], correct: 0 }
  ],
  "DNS: names to numbers": [
    { q: "What does DNS turn a name into?", options: ["IP address", "MAC address", "Port number", "Protocol"], correct: 0 },
    { q: "DNS acts like a...", options: ["Phone book", "Firewall", "Web browser", "Router"], correct: 0 }
  ],
  "Requests and methods": [
    { q: "Which HTTP method is used to submit data?", options: ["POST", "GET", "OPTIONS", "HEAD"], correct: 0 },
    { q: "Which method is typically used to fetch a page?", options: ["GET", "POST", "PUT", "DELETE"], correct: 0 }
  ],
  "Status codes": [
    { q: "What does a 404 status code mean?", options: ["Not found", "OK", "Server Error", "Redirect"], correct: 0 },
    { q: "Which status code means 'Server Error'?", options: ["500", "200", "301", "403"], correct: 0 }
  ],
  "Headers and cookies": [
    { q: "Where are cookies usually sent?", options: ["In headers", "In the URL", "In the body", "They aren't sent"], correct: 0 },
    { q: "Why should session cookies be HttpOnly?", options: ["Prevent JS access", "Make them faster", "Allow cross-site tracking", "Save space"], correct: 0 }
  ],
  "Hashing vs encryption": [
    { q: "Can a hash be reversed back to original text?", options: ["No", "Yes", "Only with a key", "Only if short"], correct: 0 },
    { q: "Encryption is designed to be...", options: ["Two-way", "One-way", "Slower than hashing", "Only for passwords"], correct: 0 }
  ],
  "Why salts and slow hashes": [
    { q: "What does a salt do?", options: ["Makes hashes unique", "Speeds up hashing", "Encrypts the hash", "Deletes passwords"], correct: 0 },
    { q: "Why are password hashes like bcrypt deliberately slow?", options: ["To prevent fast guessing", "Because they are old", "To save space", "To use less RAM"], correct: 0 }
  ],
  "Strong passwords": [
    { q: "What is the most important factor for password strength?", options: ["Length", "Complexity", "Changing it often", "Not writing it down"], correct: 0 },
    { q: "A strong password should be...", options: ["Unique per site", "The same everywhere", "Short", "Your pet's name"], correct: 0 }
  ],
  "Passive vs active recon": [
    { q: "Which recon type interacts with the target?", options: ["Active", "Passive", "Search engine", "Whois"], correct: 0 },
    { q: "Passive recon is usually...", options: ["Invisible to the target", "Noisy", "Illegal", "Slower than active"], correct: 0 }
  ],
  "Scanning with nmap": [
    { q: "What does nmap primarily do?", options: ["Find open ports", "Crack passwords", "Exploit SQLi", "Edit files"], correct: 0 },
    { q: "What does the -sV flag do in nmap?", options: ["Service version detection", "Stealth scan", "Verbose output", "Scan vulnerabilities"], correct: 0 }
  ],
  "What is SQL injection": [
    { q: "SQL injection attacks target what?", options: ["Databases", "Firewalls", "Web browsers", "Routers"], correct: 0 },
    { q: "What does '1'='1' do in an SQL injection?", options: ["Makes the condition true", "Causes an error", "Deletes data", "Exits the query"], correct: 0 }
  ],
  "Finding and preventing it": [
    { q: "What is the best prevention against SQL injection?", options: ["Parameterized queries", "Regex filtering", "WAF", "HTTPS"], correct: 0 },
    { q: "A single quote (') breaking a page might indicate...", options: ["SQL Injection", "XSS", "CSRF", "DDoS"], correct: 0 }
  ],
  "Your first script": [
    { q: "What is the shebang line?", options: ["#!/bin/bash", "#/bash", "//bash", "!--bash"], correct: 0 },
    { q: "Which command makes a script executable?", options: ["chmod +x", "chown +x", "chmod +r", "exec"], correct: 0 }
  ],
  "Loops and arguments": [
    { q: "What does $1 represent in a bash script?", options: ["The first argument", "The script name", "Process ID", "Status code"], correct: 0 },
    { q: "Loops are useful for...", options: ["Automation", "Deleting files", "Creating users", "Downloading files"], correct: 0 }
  ],
  "Capturing traffic": [
    { q: "What tool captures network traffic?", options: ["Wireshark", "Nmap", "Metasploit", "Burp Suite"], correct: 0 },
    { q: "To capture traffic, you must select an...", options: ["Interface", "IP address", "Port", "Encryption key"], correct: 0 }
  ],
  "Display filters": [
    { q: "Which filter shows only HTTP traffic?", options: ["http", "tcp.port==80", "web", "http.only"], correct: 0 },
    { q: "Why is plain HTTP risky to capture?", options: ["Credentials show in plain text", "It crashes Wireshark", "It uses too much space", "It is illegal"], correct: 0 }
  ],
  "What XSS is": [
    { q: "XSS primarily targets who?", options: ["Other users' browsers", "The database", "The web server", "The firewall"], correct: 0 },
    { q: "Stored XSS means the payload is...", options: ["Saved in the database", "Reflected in the URL", "In the DOM", "In a cookie"], correct: 0 }
  ],
  "Stopping XSS": [
    { q: "A primary defense against XSS is...", options: ["Output encoding", "Parameterized queries", "HTTPS", "VPN"], correct: 0 },
    { q: "Setting a cookie to HttpOnly prevents...", options: ["JavaScript reading it", "Browsers sending it", "Servers reading it", "Users seeing it"], correct: 0 }
  ],
  "Encoding is not encryption": [
    { q: "Does base64 require a key to decode?", options: ["No", "Yes", "Only for images", "Only for passwords"], correct: 0 },
    { q: "Base64 text often ends with which character?", options: ["=", ";", "}", "/"], correct: 0 }
  ],
  "Caesar and XOR": [
    { q: "How many possible shifts are there in a standard Caesar cipher?", options: ["25", "256", "128", "Infinite"], correct: 0 },
    { q: "If you XOR a ciphertext with its key, you get...", options: ["The plaintext", "Another ciphertext", "A hash", "An error"], correct: 0 }
  ],
  "Enumerate first": [
    { q: "Which command shows what you can run as root?", options: ["sudo -l", "id", "whoami", "uname"], correct: 0 },
    { q: "What does 'uname -a' show?", options: ["System information", "User permissions", "Running processes", "Open ports"], correct: 0 }
  ],
  "SUID and sudo": [
    { q: "A SUID binary runs as...", options: ["Its owner", "The user running it", "Nobody", "The web server"], correct: 0 },
    { q: "Where can you find one-liners to abuse misconfigured binaries?", options: ["GTFOBins", "ExploitDB", "NVD", "GitHub"], correct: 0 }
  ],
  "What OSINT is": [
    { q: "OSINT involves gathering information from...", options: ["Public sources", "Hacked databases", "Phishing", "Malware"], correct: 0 },
    { q: "The most important rule in OSINT is...", options: ["Ethics/Authorization", "Speed", "Using Kali Linux", "Staying anonymous"], correct: 0 }
  ],
  "Search like a pro": [
    { q: "Operators like 'site:' and 'filetype:' are known as...", options: ["Google dorks", "Search hacks", "Query filters", "Regex"], correct: 0 },
    { q: "Which tool extracts metadata from images?", options: ["exiftool", "nmap", "wireshark", "sqlmap"], correct: 0 }
  ]
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  
  try {
    const lessons = await pool.query("SELECT id, title FROM lessons");
    let added = 0;
    
    for (const lesson of lessons.rows) {
      const qList = LESSON_QUESTIONS[lesson.title];
      if (qList) {
        // Delete existing questions to prevent duplicates
        await pool.query("DELETE FROM lesson_questions WHERE lesson_id = $1", [lesson.id]);
        
        let order = 0;
        for (const q of qList) {
          await pool.query(
            `INSERT INTO lesson_questions (lesson_id, question, options, correct_option, order_index)
             VALUES ($1, $2, $3, $4, $5)`,
            [lesson.id, q.q, JSON.stringify(q.options), q.correct, order++]
          );
          added++;
        }
      }
    }
    
    console.log(`Successfully added ${added} questions to lessons!`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
