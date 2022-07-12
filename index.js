#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;
const hashes = new Set(['md5', 'sha1', 'sha256', 'sha512']);
const program = new Command();
program.buffer = [];
program
  .option('-f, --file <string>', 'File to read with user emails. Newline delimited list of emails.')
  .option('-H, --hash <string>', 'Hash function to use: MD5, SHA1, SHA256, SHA512', 'md5')
  .option('-o, --output <string>', 'File to write output to. Default is stdout.', '-')
  .option('-p, --pretty', 'Output formatted JSON, Yes/No', false)
  .action((argument) => {
    const file = argument.file;
    const hash = argument.hash?.toLowerCase();
    const stdout = argument.output === '-';
    const pretty = argument.pretty;
    if (!file || !fs.existsSync(file)) {
      console.error(chalk.red`File [${file}] not found \n`);
      program.help();
      process.exit(1);
    }
    if (!hashes.has(hash)) console.error(`Hash [${hash}] not supported`);
    program.output = argument.output;
    program.pretty = pretty;
    program.stdout = stdout;
    program.hash = hash;
    program.emails = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((email) => email.length > 0);
  })
  .version(version)
  .description('Backoffice CLI user generator')
  .name('User generator')
  .parse(process.argv);

const randomString = (size = 16) => crypto.randomBytes(size).toString('base64').slice(0, size);
const generateHash = (str) => crypto.createHash(program.hash).update(str).digest('hex');

for (const email of program.emails) {
  const salt = randomString(8);
  const password = randomString(16);
  const hash = generateHash(salt + password);

  program.buffer.push({
    UserName: email,
    PasswordSalt: salt,
    PasswordHash: hash,
    CallerId: 'Kaizen.Caller',
    Role: 'company-support',
    hash: program.hash,
  });
}

if (program.stdout) {
  if (program.pretty) {
    console.log(JSON.stringify(program.buffer, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify(program.buffer));
  process.exit(0);
}

try {
  if (program.pretty) {
    fs.writeFileSync(program.output, JSON.stringify(program.buffer, null, 2));
    console.info(chalk.green`File [${program.output}] created`);
    process.exit(0);
  }

  fs.appendFileSync(program.output, JSON.stringify(program.buffer));
  process.exit(0);
} catch (e) {
  console.error(chalk.red`Was not able to write to file [${program.output}] [${e.message}]`);
  process.exit(1);
}
