import { promises as fs } from 'fs';
import clipboardy from 'clipboardy';
import path from 'path';
import url from 'url';
import notifier from 'node-notifier';
import { watch } from 'fs';

/**
 * @typedef {Object} ErrorPattern
 * @property {RegExp} pattern - Regular expression to match errors
 * @property {string} type - Type of error (e.g., 'typescript', 'npm')
 * @property {string} severity - Error severity level
 */

/**
 * @typedef {Object} ErrorStats
 * @property {number} count - Number of occurrences
 * @property {Date} firstSeen - First occurrence timestamp
 * @property {Date} lastSeen - Last occurrence timestamp
 * @property {string} type - Error type
 * @property {string} severity - Error severity
 */

/**
 * Default configuration for the Error Monitor
 */
const CONFIG = {
    maxBufferLines: 200,
    checkInterval: 1000,
    contextBefore: 5,
    contextAfter: 20,
    customPrompt: null,
    maxErrorsPerType: 100,
    useFileWatcher: true,
    errorPatterns: [
        {
            pattern: /error TS\d+:/i,
            type: 'typescript',
            severity: 'high'
        },
        {
            pattern: /npm ERR!/i,
            type: 'npm',
            severity: 'high'
        },
        {
            pattern: /(?:TypeError|ReferenceError|SyntaxError|RangeError):/i,
            type: 'javascript',
            severity: 'critical'
        },
        {
            pattern: /Error:|Exception:|Failed:/i,
            type: 'general',
            severity: 'high'
        },
        {
            pattern: /warning:/i,
            type: 'warning',
            severity: 'low'
        }
    ]
};

/**
 * Parse command line arguments and return configuration object
 */
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {
        logPath: null,
        config: { ...CONFIG }
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--log':
            case '-l':
                options.logPath = args[++i];
                break;
            case '--prompt':
            case '-p':
                options.config.customPrompt = args[++i];
                break;
            case '--interval':
            case '-i':
                options.config.checkInterval = parseInt(args[++i], 10);
                break;
            case '--context-before':
            case '-b':
                options.config.contextBefore = parseInt(args[++i], 10);
                break;
            case '--context-after':
            case '-a':
                options.config.contextAfter = parseInt(args[++i], 10);
                break;
            case '--patterns':
                options.config.customPatterns = args[++i];
                break;
            case '--watch':
            case '-w':
                options.config.useFileWatcher = args[++i] === 'true';
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            default:
                if (arg.startsWith('-')) {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(1);
                }
        }
    }

    if (!options.logPath) {
        options.logPath = path.join(process.cwd(), 'app.log');
    }

    return options;
}

/**
 * Print help information
 */
function printHelp() {
    console.log(`
Error Monitor - Real-time error detection and AI-assisted debugging

Usage: node error-monitor.js [options]

Options:
  -l, --log <path>           Path to log file (default: ./app.log)
  -p, --prompt <template>    Custom error analysis prompt template
  -i, --interval <ms>        Check interval in milliseconds (default: 1000)
  -b, --context-before <n>   Lines of context before error (default: 5)
  -a, --context-after <n>    Lines of context after error (default: 20)
  --patterns <path>          Path to custom error patterns JSON file
  -w, --watch <bool>         Use file watcher instead of polling (default: true)
  -h, --help                 Show this help message

Examples:
  node error-monitor.js --log /var/log/app.log
  node error-monitor.js -l ./logs/dev.log -i 2000 -b 10 -a 30
  node error-monitor.js --prompt "path/to/custom-prompt.txt"
  node error-monitor.js --patterns "path/to/patterns.json"
`);
}

class ErrorMonitor {
    constructor(logPath, config = CONFIG) {
        this.logPath = logPath;
        this.config = config;
        this.buffer = [];
        this.lastContent = '';
        this.lastClipboardContent = '';
        this.isProcessing = false;
        this.errorStats = new Map();
        this.watcher = null;
    }

    /**
     * Initialize and start the error monitor
     */
    async start() {
        console.log('\n=== Error Monitor Starting ===');
        console.log(`Log file: ${this.logPath}`);
        console.log(`Check interval: ${this.config.checkInterval}ms`);
        console.log(`Context: ${this.config.contextBefore} lines before, ${this.config.contextAfter} lines after`);
        
        await this.loadCustomConfigurations();
        
        if (this.config.useFileWatcher) {
            this.startFileWatcher();
        } else {
            this.startFilePolling();
        }
        
        this.startClipboardMonitoring();
        this.setupShutdown();
        
        console.log('\nMonitor is active and watching for errors...');
    }

    /**
     * Load custom configurations from files
     */
    async loadCustomConfigurations() {
        try {
            // Load custom prompt if specified
            if (this.config.customPrompt) {
                console.log(`Loading custom prompt: ${this.config.customPrompt}`);
                const promptTemplate = await fs.readFile(this.config.customPrompt, 'utf8');
                this.config.customPromptTemplate = promptTemplate;
            }

            // Load custom patterns if specified
            if (this.config.customPatterns) {
                console.log(`Loading custom patterns: ${this.config.customPatterns}`);
                const patternsJson = await fs.readFile(this.config.customPatterns, 'utf8');
                const patterns = JSON.parse(patternsJson);
                
                // Convert string patterns to RegExp
                patterns.forEach(pattern => {
                    pattern.pattern = new RegExp(pattern.pattern, pattern.flags || 'i');
                });
                
                this.config.errorPatterns = patterns;
            }
        } catch (error) {
            console.error('Error loading custom configurations:', error);
            process.exit(1);
        }
    }

    /**
     * Start file watcher using fs.watch
     */
    startFileWatcher() {
        console.log('Starting file watcher...');
        
        try {
            this.watcher = watch(this.logPath, async (eventType) => {
                if (eventType === 'change' && !this.isProcessing) {
                    await this.processLogFile();
                }
            });
        } catch (error) {
            console.error('Error setting up file watcher:', error);
            console.log('Falling back to polling...');
            this.startFilePolling();
        }
    }

    /**
     * Start file polling
     */
    startFilePolling() {
        console.log('Starting file polling...');
        setInterval(async () => {
            await this.processLogFile();
        }, this.config.checkInterval);
    }

    /**
     * Process the log file for new content
     */
    async processLogFile() {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            const content = await this.readLogFile();
            
            if (!content || content === this.lastContent) {
                return;
            }

            this.updateBuffer(content);
            const errorInfo = this.findFirstError();

            if (errorInfo) {
                const context = this.getErrorContext(errorInfo.index);
                await this.handleError(errorInfo, context);
                this.updateErrorStats(errorInfo);
            }

            this.lastContent = content;
        } catch (error) {
            console.error('Error processing log file:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Update error statistics
     */
    updateErrorStats(errorInfo) {
        const key = `${errorInfo.type}-${errorInfo.line}`;
        
        if (!this.errorStats.has(key)) {
            this.errorStats.set(key, {
                count: 1,
                firstSeen: new Date(),
                lastSeen: new Date(),
                type: errorInfo.type,
                severity: errorInfo.severity
            });
        } else {
            const stats = this.errorStats.get(key);
            stats.count++;
            stats.lastSeen = new Date();
        }

        // Cleanup old stats if needed
        if (this.errorStats.size > this.config.maxErrorsPerType) {
            const oldestKey = Array.from(this.errorStats.keys())[0];
            this.errorStats.delete(oldestKey);
        }
    }

    /**
     * Read the log file
     */
    async readLogFile() {
        try {
            const content = await fs.readFile(this.logPath, 'utf8');
            return content;
        } catch (error) {
            console.error(`Error reading log file: ${error.message}`);
            return null;
        }
    }

    /**
     * Update the line buffer with new content
     */
    updateBuffer(content) {
        const lines = content.split('\n');
        this.buffer = lines.slice(-this.config.maxBufferLines);
    }

    /**
     * Find the first error in the buffer
     */
    findFirstError() {
        for (let i = 0; i < this.buffer.length; i++) {
            const line = this.buffer[i];
            for (const errorDef of this.config.errorPatterns) {
                if (errorDef.pattern.test(line)) {
                    return {
                        line,
                        index: i,
                        type: errorDef.type,
                        severity: errorDef.severity
                    };
                }
            }
        }
        return null;
    }

    /**
     * Get context lines around an error
     */
    getErrorContext(errorIndex) {
        const start = Math.max(0, errorIndex - this.config.contextBefore);
        const end = Math.min(this.buffer.length, errorIndex + this.config.contextAfter + 1);
        return this.buffer.slice(start, end).join('\n');
    }

    /**
     * Process clipboard content for auto-ai directives
     */
    async processClipboardContent(content) {
        try {
            if (!content.startsWith('#auto-ai')) {
                return;
            }

            console.log('\nProcessing #auto-ai directive...');
            
            const lines = content.split('\n');
            if (lines.length < 3) {
                throw new Error('Invalid #auto-ai format. Expected: directive, path, and content');
            }

            const [directive, command = 'replace'] = lines[0].split(' ');
            const filePath = lines[1].trim();
            const fileContent = lines.slice(2).join('\n');

            console.log(`Command: ${command}`);
            console.log(`Target path: ${filePath}`);
            
            await this.writeFile(filePath, fileContent, command);

            notifier.notify({
                title: 'File Operation Success',
                message: `File ${command === 'append' ? 'appended' : 'written'}: ${filePath}`,
                sound: true
            });
        } catch (error) {
            console.error('Error processing clipboard content:', error);
            notifier.notify({
                title: 'Error',
                message: error.message,
                sound: true
            });
        }
    }

    /**
     * Write or append to a file
     */
    async writeFile(filePath, content, command) {
        try {
            const logDir = path.dirname(path.resolve(this.logPath));
            const absolutePath = path.join(logDir, filePath.replace(/^\//, ''));
            
            console.log('Log directory:', logDir);
            console.log(`Writing to: ${absolutePath}`);
            console.log('Content length:', content.length);
            
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            
            if (command === 'append') {
                await fs.appendFile(absolutePath, content, 'utf8');
                console.log('Successfully appended to file');
            } else {
                await fs.writeFile(absolutePath, content, 'utf8');
                console.log('Successfully wrote file');
            }
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Start clipboard monitoring
     */
    startClipboardMonitoring() {
        console.log('Starting clipboard monitoring...');
        setInterval(async () => {
            try {
                const content = await clipboardy.read();
                if (content && content !== this.lastClipboardContent) {
                    console.log('\nNew clipboard content detected');
                    await this.processClipboardContent(content);
                    this.lastClipboardContent = content;
                }
            } catch (error) {
                console.error('Error reading clipboard:', error);
            }
        }, 1000);
    }

    /**
     * Handle detected errors
     */
    async handleError(errorInfo, context) {
        try {
            const errorData = {
                type: errorInfo.type,
                severity: errorInfo.severity,
                timestamp: new Date().toISOString(),
                context: context
            };

            const prompt = this.formatErrorPrompt(errorData);
            await clipboardy.write(prompt);

            notifier.notify({
                title: `Error Detected (${errorInfo.type})`,
                message: 'Error context copied to clipboard with AI prompt',
                sound: true
            });

            console.log('\nError detected and copied to clipboard:');
            console.log('-'.repeat(50));
            console.log(prompt);
            console.log('-'.repeat(50));

        } catch (error) {
            console.error('Error handling error:', error);
        }
    }

    /**
     * Format error prompt using template or default format
     */
    formatErrorPrompt(error) {
        if (this.config.customPromptTemplate) {
            return this.config.customPromptTemplate
                .replace('${type}', error.type)
                .replace('${severity}', error.severity)
                .replace('${timestamp}', error.timestamp)
                .replace('${context}', error.context);
        }

        return `
#ERROR_ANALYSIS_REQUEST

Error Context:
Type: ${error.type}
Severity: ${error.severity}
Timestamp: ${error.timestamp}

Error and Context:
${error.context}

Please provide:
1. Root Cause Analysis
2. File Location Analysis
3. Suggested Fixes (using #auto-ai format)
4. Prevention Suggestions
`;
    }

    /**
     * Generate error statistics report
     */
    generateErrorReport() {
        const report = {
            totalErrors: 0,
            errorsByType: {},
            errorsBySeverity: {},
            mostFrequent: []
        };

        for (const stats of this.errorStats.values()) {
            report.totalErrors += stats.count;
            
            // Count by type
            report.errorsByType[stats.type] = (report.errorsByType[stats.type] || 0) + stats.count;
            
            // Count by severity
            report.errorsBySeverity[stats.severity] = (report.errorsBySeverity[stats.severity] || 0) + stats.count;
        }

        // Get most frequent errors
        const sortedErrors = Array.from(this.errorStats.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);

        report.mostFrequent = sortedErrors.map(([key, stats]) => ({
            type: stats.type,
            count: stats.count,
            firstSeen: stats.firstSeen,
            lastSeen: stats.lastSeen
        }));

        return report;
    }

    /**
     * Setup shutdown handler
     */
    setupShutdown() {
        const cleanup = () => {
            console.log('\nShutting down Error Monitor...');
            
            if (this.watcher) {
                this.watcher.close();
            }

            // Generate final report
            const report = this.generateErrorReport();
            console.log('\nFinal Error Report:');
            console.log(JSON.stringify(report, null, 2));
            
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }
}

// Run if called directly
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    const { logPath, config } = parseCommandLineArgs();
    console.log('\n🚀 Error Monitor Initialized!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Active Configuration:');
    console.log({
        '📝 Log Path': logPath,
        '⏱️  Check Interval': `${config.checkInterval}ms`,
        '👆 Context Before': `${config.contextBefore} lines`,
        '👇 Context After': `${config.contextAfter} lines`,
        '🎯 Custom Prompt': config.customPrompt || 'Default',
        '👀 File Watcher': config.useFileWatcher ? 'Active' : 'Polling'
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Try this prompt to generate a test file:');
    console.log(`give me a simple node script that does random stuff.... simple arithmetic is fine.. 
    make multiplication function throw an error when called with negative numbers 
    
    /src/test/random.js -- this is where the file will be on disk
    Please generate the code with the header below, it will be part of the generated code
    
    #auto-ai replace
    /src/test/random.js
    // content here`);
    const monitor = new ErrorMonitor(logPath, config);
    monitor.start().catch(error => {
        console.error('Failed to start monitor:', error);
        process.exit(1);
    });
}

export { ErrorMonitor, CONFIG };