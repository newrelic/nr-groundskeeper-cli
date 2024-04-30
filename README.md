# Groundskeeper CLI

CLI application that analyzes APM applications in your New Relic account and generates a CSV report with recommendations for out-of-date agents.

## Prerequesites

- [Node.js](https://nodejs.org/en) (version 18 or higher) is required to run the application.
- New Relic [user key](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/#user-key)

## Installation

> The CLI requires [Node](). Ideally version 18  

To install the application, follow these steps:

1. Clone this repository to your local machine:

```bash
git clone https://github.com/newrelic/nr-groundskeeper-cli.git
```

2. Navigate to the project directory:

```bash
cd nr-groundskeeper-cli
```

3. Install the required dependencies:

```bash
npm install
```

## Usage

### Running the application

Use the following command with the appropriate options (see below), within the project directory, to run the application:

```bash
node .
```

### Options

```bash
      --help        Show help                                          [boolean]
      --version     Show version number                                [boolean]
  -k, --api-key     New Relic API key                        [string] [required]
  -a, --account-id  Account ID                               [number] [required]
  -f, --file        Path to file to output results                      [string]
  -e, --error       Path to file to write error messages                [string]
  -r, --region      Use "eu" if region for the account is EU 
```

Here is an example of how to run the application and specify a custom output file:

```bash
node . -k QWERTYUIOPASDFGHJKLZXCVBNM -a 123456789 -f out.csv -e err.log
```

## License

This project is licensed under the Apache 2 License - see the [LICENSE](LICENSE) file for details.

## Issues and Contributions

If you encounter any issues or have suggestions for improvements, please open an [issue](issues). Contributions are welcome!
