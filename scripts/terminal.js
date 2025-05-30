const MAX_HISTORY = 1000;

export class TerminalUI {
    constructor(container, bannerLoader = () => { }) {
        this.loadBanner = bannerLoader;
        this.emu = container;
        this.sshSessionActive = false;
        this.history = [];
        this.historyIndex = -1;
        this.commands = {
            ssh: {
                info: 'Connect to a remote server via SSH',
                help: [
                    'Usage: ssh user@host[:port]',
                    'Connects via SSH to a remote host using the given user and optional port.',
                    'Example:',
                    '  ssh alice@example.com',
                    '  ssh alice@example.com:2222'
                ].join('\n'),
                run: (args) => this.runSSH(args)
            },
            cd: {
                info: 'Navigate to another page',
                help: [
                    'Usage: cd <section>',
                    'Redirects the user to ./html/<section>.html',
                    'Example:',
                    '  cd about'
                ].join('\n'),
                run: (args) => this.runCD(args)
            },
            ls: {
                info: 'List available HTML pages',
                help: [
                    'Usage: ls [-l]',
                    'Lists all HTML files in the repository root.',
                    'With -l, shows detailed information about each file.',
                    'Example:',
                    '  ls',
                    '  ls -l'
                ].join('\n'),
                run: (args) => this.runLS(args)
            },
            neofetch: {
                info: 'Display system information',
                help: [
                    'Usage: neofetch',
                    'Displays system information in a styled format.',
                    'Example:',
                    '  neofetch'
                ].join('\n'),
                run: () => this.runNeofetch()
            },
            help: {
                info: 'Show help for commands',
                help: [
                    'Usage: help [command]',
                    'With no arguments, shows a list of available commands and their descriptions.',
                    'With a command name, shows detailed help for that command.',
                    'Example:',
                    '  help ssh'
                ].join('\n'),
                run: (args) => this.runHelp(args)
            },
            clear: {
                info: 'Clear the terminal screen',
                help: [
                    'Usage: clear',
                    'Clears all previous output from the terminal.'
                ].join('\n'),
                run: () => this.runClear()
            }
        };
    }

    async init() {
        await this.loadDependencies();
        const cursor = await this.waitForBanner();
        cursor.remove();

        this.emu = document.createElement('terminal-emu');
        Object.assign(this.emu.style, {
            display: 'block',
            whiteSpace: 'pre-wrap',
            font: 'inherit',
            color: 'inherit',
            background: 'inherit',
            overflowY: 'auto',
            maxHeight: '100%'
        });
        cursor.parentNode.appendChild(this.emu);

        this.restoreHistory();
        this.addInputLine();
    }

    async loadDependencies() {
        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/xterm/lib/xterm.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });

        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/isontheline/pro.webssh/ssh.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    async waitForBanner() {
        return new Promise(resolve => {
            const existing = document.querySelector('.am-cursor');
            if (existing) return resolve(existing);

            const observer = new MutationObserver((_, obs) => {
                const cursor = document.querySelector('.am-cursor');
                if (!cursor) return;
                obs.disconnect();
                resolve(cursor);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    restoreHistory() {
        const stored = JSON.parse(localStorage.getItem('terminal-output') || '[]');
        stored.forEach(line => this.printLine(line));
        this.history = stored.filter(line => /^\$\s*/.test(line)).map(line => line.replace(/^\$\s*/, ''));
    }

    getPreviousCommand() {
        if (this.history.length === 0) return '';
        if (this.historyIndex > 0) this.historyIndex--;
        return this.history[this.historyIndex] || '';
    }

    getNextCommand() {
        if (this.history.length === 0) return '';
        if (this.historyIndex < this.history.length - 1) this.historyIndex++;
        return this.history[this.historyIndex] || '';
    }

    printLine(text = '<span class="green">kitty@kittycrypto</span><span class="blue">:~</span><span class="teal">$</span>') {
        const lineContainer = document.createElement('div');
        lineContainer.innerHTML = text;
        this.emu.appendChild(lineContainer);
        this.emu.appendChild(document.createElement('br'));
        this.emu.scrollTop = this.emu.scrollHeight;
        const history = JSON.parse(localStorage.getItem('terminal-output') || '[]');
        history.push(lineContainer.textContent); // Save only the visible text, not HTML
        if (history.length > MAX_HISTORY) history.shift();

        localStorage.setItem('terminal-output', JSON.stringify(history));
    }

    addInputLine() {
        if (this.sshSessionActive) return;
        const line = document.createElement('div');
        Object.assign(line.style, {
            outline: 'none',
            font: 'inherit',
            color: 'inherit',
            background: 'inherit',
            display: 'inline-block',
            width: '100%'
        });

        line.contentEditable = true;
        line.spellcheck = false;
        line.innerText = '$ ';
        this.emu.appendChild(line);
        line.focus();

        const handler = async (e) => {
            if (e.key === 'ArrowUp') {
                if (document.activeElement === line) {
                    const prev = this.getPreviousCommand();
                    if (prev) line.innerText = `$ ${prev}`;
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                if (document.activeElement === line) {
                    const next = this.getNextCommand();
                    line.innerText = `$ ${next || ''}`;
                }
                return;
            }

            if (e.key !== 'Enter') return;

            e.preventDefault();
            const full = line.innerText;
            const input = full.replace(/^\$\s*/, '').trim();
            if (input !== this.history[this.history.length - 1]) {
                this.history.push(input);
                if (this.history.length > MAX_HISTORY) this.history.shift();
            }
            this.historyIndex = this.history.length;

            this.printLine(`$ ${input}`);
            line.removeEventListener('keydown', handler);
            line.contentEditable = false;

            const [cmd, ...args] = input.split(' ');
            const command = this.commands[cmd];

            if (!command) {
                this.printLine('Unknown command');
                this.addInputLine();
                return;
            }

            await command.run(args);
            this.addInputLine();
        };

        line.addEventListener('keydown', handler);
    }

    async runSSH(args) {
        const [userAtPort] = args;
        if (!userAtPort) {
            this.printLine('Usage: ssh user@host[:port]');
            return;
        }
        const [userHost, portStr] = userAtPort.split(':');
        const [user, host] = userHost?.split('@') || [];
        if (!user || !host) {
            this.printLine('Usage: ssh user@host[:port]');
            return;
        }
        const port = portStr ? parseInt(portStr, 10) : 22;
        if (isNaN(port)) {
            this.printLine(`Invalid port: ${portStr}`);
            return;
        }
        try {
            this.sshSessionActive = true;
            this.printLine(`Connecting to ${user}@${host} on port ${port}...`);
            await SSH.connect({
                term: {
                    write: (text) => {
                        text.split('\n').forEach(line => this.printLine(line));
                    }
                },
                user,
                host,
                port,
                onclose: () => {
                    this.sshSessionActive = false;
                    this.printLine('[Session closed]');
                    this.addInputLine();
                }
            });
        } catch (err) {
            this.printLine('SSH connection failed:');
            this.printLine(err.message || String(err));
        }
    }

    async runHelp(args) {
        if (args.length === 0) {
            this.printLine('Available commands:\n');
            Object.entries(this.commands).forEach(([name, { info }]) => {
                this.printLine(`${name} — ${info}`);
            });
            return;
        }
        const [query] = args;
        const command = this.commands[query];
        if (!command) {
            this.printLine(`No help found for '${query}'`);
            return;
        }
        this.printLine(`Help for '${query}':\n`);
        this.printLine(command.help);
    }

    runCD(args) {
        const [target] = args;
        if (!target) {
            this.printLine('Usage: cd <section>');
            return;
        }

        const stripped = target.trim().toLowerCase();
        const hasExtension = stripped.endsWith('.html');
        const base = hasExtension ? stripped : `${stripped}.html`;
        const safeName = base.replace(/[^a-z0-9_.-]/gi, ''); // allow dots for .html

        if (!safeName.endsWith('.html')) {
            this.printLine('Invalid target. Must resolve to an HTML file.');
            return;
        }

        this.printLine(`Navigating to ./${safeName}...`);
        setTimeout(() => {
            window.location.href = `./${safeName}`;
        }, 300);
    }

    runClear() {
        this.emu.innerHTML = '';
        localStorage.setItem('terminal-output', JSON.stringify([]));
    }

    async runLS(args = []) {
        const longFormat = args.includes('-l');
        const repoPath = 'kittyCrypto-gg/kittycrypto';

        try {
            const contentRes = await fetch(`https://api.github.com/repos/${repoPath}/contents`);
            if (!contentRes.ok) {
                this.printLine(`Failed to fetch repository contents (${contentRes.status})`);
                return;
            }

            const files = await contentRes.json();
            const htmlFiles = files.filter(file => file.name.endsWith('.html'));

            if (htmlFiles.length === 0) {
                this.printLine('No HTML pages found in the repository root.');
                return;
            }

            if (!longFormat) {
                htmlFiles.forEach(file => this.printLine(file.name));
                return;
            }

            for (const file of htmlFiles) {
                const commitRes = await fetch(`https://api.github.com/repos/${repoPath}/commits?path=${file.name}&page=1&per_page=1`);
                if (!commitRes.ok) {
                    this.printLine(`${file.name} — (error fetching commit data)`);
                    continue;
                }

                const [latestCommit] = await commitRes.json();
                const sha = latestCommit?.sha?.slice(0, 7) || 'unknown';
                const date = new Date(latestCommit?.commit?.committer?.date).toLocaleString();
                const committer = latestCommit?.commit?.committer?.name || 'unknown';

                this.printLine(`${file.name.padEnd(20)} ${sha}  ${committer.padEnd(15)}  ${date}`);
            }
        } catch (err) {
            this.printLine('Error fetching file list or commit info.');
            this.printLine(err.message || String(err));
        }
    }

    async runNeofetch() {
        this.clear();
        await this.loadBanner();
        this.printLine();
    }
}