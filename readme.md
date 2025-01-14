# Error Monitor

An intelligent error monitoring system that automatically detects errors in log files and generates AI-ready prompts for quick problem resolution. The system watches both log files and clipboard content, making it easy to implement AI-suggested fixes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## Features

- 🔍 Real-time error detection in log files
- 🤖 AI-ready error analysis prompts
- 📋 Clipboard monitoring for automated fixes
- 📊 Error statistics and reporting
- 🎯 Customizable error patterns
- 📝 Custom prompt templates
- ⚡ File watching or polling modes
- 🔔 Desktop notifications

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/error-monitor.git

# Navigate to the project directory
cd error-monitor

# Install dependencies
npm install
```

## Quick Start

```bash
# Basic usage with default settings
node error-monitor.js

# Monitor a specific log file
node error-monitor.js --log /path/to/your/app.log

# Show help
node error-monitor.js --help
```

## Command Line Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| --log | -l | Path to log file | ./app.log |
| --prompt | -p | Custom prompt template file | - |
| --interval | -i | Check interval (ms) | 1000 |
| --context-before | -b | Lines before error | 5 |
| --context-after | -a | Lines after error | 20 |
| --patterns | - | Custom error patterns file | - |
| --watch | -w | Use file watcher | true |
| --help | -h | Show help | - |

## Customization

### Custom Error Patterns

Create a JSON file with your error patterns:

```json
[
  {
    "pattern": "error TS\\d+:",
    "type": "typescript",
    "severity": "high",
    "flags": "i"
  },
  {
    "pattern": "npm ERR!",
    "type": "npm",
    "severity": "high",
    "flags": "i"
  }
]
```

Use it with:
```bash
node error-monitor.js --patterns ./patterns.json
```

### Custom Prompt Template

Create a text file with your prompt template:

```text
#CUSTOM_ERROR_ANALYSIS

Error Details:
- Type: ${type}
- Severity: ${severity}
- Time: ${timestamp}

Context:
${context}

Analysis needed:
1. What caused this error?
2. How can we fix it?
3. How to prevent it?
```

Use it with:
```bash
node error-monitor.js --prompt ./prompt.txt
```

## Auto-AI Format

The monitor watches for clipboard content in the following format:

```
#auto-ai [command]
/path/to/file
content...
```

Commands:
- `replace` (default): Overwrites the file
- `append`: Adds content to the end of the file

## Error Statistics

The monitor tracks error statistics including:
- Total error count
- Errors by type
- Errors by severity
- Most frequent errors
- First and last occurrence timestamps

A report is generated when the monitor is shut down (Ctrl+C).

## Requirements

- Node.js >= 16.0.0
- NPM >= 7.0.0

## Dependencies

- `clipboardy`: Clipboard access
- `node-notifier`: Desktop notifications
- Other dependencies listed in package.json

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you're having any problems, please:
1. Check the [Issues](https://github.com/yourusername/error-monitor/issues) page
2. Create a new issue if needed
3. Join our [Discord community](your-discord-link)

## Acknowledgments

- Thanks to all contributors
- Inspired by various error monitoring solutions
- Built with ❤️ by [Your Name/Organization]

## Roadmap

- [ ] Add support for multiple log files
- [ ] Implement error pattern learning
- [ ] Add web interface for monitoring
- [ ] Support for more notification channels
- [ ] Add error pattern marketplace

## Related Projects

- [Your Other Project](link)
- [Another Related Tool](link)