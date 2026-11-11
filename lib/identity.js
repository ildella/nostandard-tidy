const {identityRuleNames} = require('./catalogs')

const splitIdentity = (entry) => entry.split(':')

const identityRule = (entry) => splitIdentity(entry)[0]

const identityFile = (entry) => {
  const parts = splitIdentity(entry)
  return parts[0] === 'duplicate-export'
    ? (parts[2] ?? '').split('|')[0]
    : (parts[1] ?? '')
}

const identityDetail = (entry) => {
  const parts = splitIdentity(entry)
  if (parts[0] !== 'duplicate-export') return parts.slice(2).join(':')
  const files = (parts[2] ?? '').split('|')
  return `${parts[1]} — ${files.slice(1).join(' | ')}`
}

const identityRuleName = (rule) => identityRuleNames[rule] ?? rule.replace(/-/g, ' ')

const groupByFile = (entries) => {
  const groups = new Map()
  for (const entry of entries) {
    const file = identityFile(entry)
    groups.set(file, [...(groups.get(file) ?? []), entry])
  }
  return [...groups.entries()]
    .sort(([leftFile, leftEntries], [rightFile, rightEntries]) =>
      rightEntries.length - leftEntries.length || leftFile.localeCompare(rightFile))
}

module.exports = {
  splitIdentity,
  identityRule,
  identityFile,
  identityDetail,
  identityRuleName,
  groupByFile,
}
