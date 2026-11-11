#!/usr/bin/env node
const {TidyError} = require('../lib/discover')
const commands = require('../lib/commands')

const USAGE = `usage:
  tidy gate   [--config-dir DIR] [--debt FILE] [--min-score N]
  tidy category <dead-code|complexity|score|duplication|architecture|styling> [--config-dir DIR]
  tidy raw <dead-code|complexity|score|duplication|architecture|styling> [--config-dir DIR] [--] [...args]
  tidy debt   [--debt FILE]
  tidy prune  [--config-dir DIR] [--debt FILE]`

const CATEGORIES = ['dead-code', 'complexity', 'score', 'duplication', 'architecture', 'styling']

const FLAGS = {
  gate: ['config-dir', 'debt', 'min-score'],
  debt: ['debt'],
  prune: ['config-dir', 'debt'],
  category: ['config-dir'],
}

class UsageError extends TidyError {
  constructor(message) {
    super(message)
    this.name = 'UsageError'
  }
}

const readFlag = (args, index) => {
  const arg = args[index]
  const equals = arg.indexOf('=')
  return {
    key: equals === -1 ? arg.slice(2) : arg.slice(2, equals),
    value: equals === -1 ? undefined : arg.slice(equals + 1),
  }
}

const parseFlags = (args, allowed) => {
  const options = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) throw new UsageError(`unexpected argument: ${arg}`)

    const {key, value} = readFlag(args, index)
    if (!allowed.includes(key)) throw new UsageError(`unknown flag: --${key}`)

    if (value === undefined) {
      const next = args[index + 1]
      if (next === undefined || next.startsWith('--')) throw new UsageError(`missing value for --${key}`)
      options[key] = next
      index += 1
    } else {
      options[key] = value
    }
  }

  return options
}

const parseScore = (value) => {
  if (value === undefined) return 85
  const score = Number(value)
  if (!Number.isFinite(score)) throw new UsageError(`invalid --min-score: ${value}`)
  return score
}

const splitRawArgs = (args) => {
  const forwarded = []
  let configDir

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--') {
      forwarded.push(...args.slice(index + 1))
      break
    }
    if (arg === '--config-dir') {
      const value = args[index + 1]
      if (value === undefined) throw new UsageError('missing value for --config-dir')
      configDir = value
      index += 1
    } else if (arg.startsWith('--config-dir=')) {
      configDir = arg.slice('--config-dir='.length)
    } else {
      forwarded.push(arg)
    }
  }

  return {configDir, args: forwarded}
}

const parse = (argv) => {
  const [command, ...rest] = argv
  if (command === undefined) throw new UsageError('missing command')
  if (command === '--help' || command === '-h') return {help: true}

  if (command === 'category') {
    const [name, ...tail] = rest
    if (!CATEGORIES.includes(name)) throw new UsageError(`unknown category: ${name ?? '(missing)'}`)
    return {command, category: name, options: parseFlags(tail, FLAGS.category)}
  }

  if (command === 'raw') {
    const [name, ...tail] = rest
    if (!CATEGORIES.includes(name)) throw new UsageError(`unknown category: ${name ?? '(missing)'}`)
    const {configDir, args} = splitRawArgs(tail)
    return {command, category: name, rest: args, options: {'config-dir': configDir}}
  }

  if (!(command in FLAGS)) throw new UsageError(`unknown command: ${command}`)

  const options = parseFlags(rest, FLAGS[command])
  if (command === 'gate') options['min-score'] = parseScore(options['min-score'])
  return {command, options}
}

const dispatch = (parsed) => {
  const options = parsed.options ?? {}

  if (parsed.command === 'gate') {
    const report = commands.gate({
      configDir: options['config-dir'],
      debt: options.debt,
      minScore: options['min-score'],
    })
    return {lines: report.lines, code: report.failed ? 1 : 0}
  }

  if (parsed.command === 'category') {
    const {status, report} = commands.category({category: parsed.category, configDir: options['config-dir']})
    return {lines: report.lines, code: status}
  }

  if (parsed.command === 'debt') {
    return {lines: commands.debt({debt: options.debt}).lines, code: 0}
  }

  if (parsed.command === 'prune') {
    return {code: commands.prune({configDir: options['config-dir'], debt: options.debt})}
  }

  return {
    code: commands.raw({
      category: parsed.category,
      args: parsed.rest,
      configDir: options['config-dir'],
    }),
  }
}

try {
  const parsed = parse(process.argv.slice(2))
  if (parsed.help) {
    console.log(USAGE)
  } else {
    const {lines, code} = dispatch(parsed)
    if (lines) console.log(lines.join('\n'))
    process.exitCode = code
  }
} catch (error) {
  if (!(error instanceof TidyError)) throw error
  process.stderr.write(error instanceof UsageError ? `${error.message}\n\n${USAGE}\n` : `${error.message}\n`)
  process.exitCode = 2
}
