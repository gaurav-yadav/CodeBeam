# CodeBeam

A powerful tool that enables seamless code transfer from browser to IDE with intelligent error monitoring capabilities. It watches clipboard content for special directives and automatically handles file operations, while also monitoring logs for errors and generating AI-ready prompts for quick problem resolution.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## Features

- 📋 Seamless code transfer from browser to IDE
- ⚡ Automatic file creation and updates
- 🔍 Real-time error detection in log files
- 🤖 AI-ready error analysis prompts
- 🎯 Customizable error patterns
- 📝 Custom prompt templates
- 📊 Error statistics and reporting
- 🔔 Desktop notifications

## Installation

```bash
# Clone the repository
git clone https://github.com/gaurav-yadav/CodeBeam.git

# Navigate to the project directory
cd CodeBeam

# Install dependencies
npm install
```

## Quick Start

```bash
# Start CodeBeam
npm start

# Start with specific log file
npm run dev

# Or use node directly
node src/index.js

# Monitor a specific log file
node src/index.js --log /path/to/your/app.log

# Show help
node src/index.js --help
```

## Code Transfer Format

CodeBeam watches for clipboard content in the following format:

```
#auto-ai [command]
/path/to/file
content...
```

Commands:
- `replace` (default): Overwrites the file
- `append`: Adds content to the end of the file

Example:
```
#auto-ai replace
/src/utils/math.js
const add = (a, b) => a + b;
const multiply = (a, b) => a * b;
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
node src/index.js --patterns ./patterns.json
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
node src/index.js --prompt ./prompt.txt
```

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
1. Check the [Issues](https://github.com/gaurav-yadav/CodeBeam/issues) page
2. Create a new issue if needed

## Roadmap

- [ ] Add support for multiple file watchers
- [ ] Implement pattern learning for common code blocks
- [ ] Add web interface for monitoring
- [ ] Support for more notification channels
- [ ] Add pattern marketplace for common code snippets
- [ ] IDE plugins for direct integration

## Acknowledgments

- Thanks to all contributors
- Built with ❤️ by Gaurav Yadav