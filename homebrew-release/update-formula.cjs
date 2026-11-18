module.exports = async ({ github, core, context }) => {
  const { createHash } = require('node:crypto');
  const [owner, repo] = process.env.TAP.split('/');
  const name = context.repo.repo;
  const tag = process.env.TAG;
  if (!/^v?\d+\.\d+\.\d+(?:[+.-][A-Za-z0-9.-]+)?$/.test(tag)) throw new Error('Invalid version tag');
  const path = `Formula/${name}.rb`;
  const { data: file } = await github.rest.repos.getContent({ owner, repo, path, ref: 'main' });
  const original = Buffer.from(file.content, 'base64').toString();
  const lines = original.split('\n');
  const versions = lines.flatMap((line, i) => /^\s*version "/.test(line) ? [i] : []);
  if (versions.length !== 1) throw new Error('Expected one formula version');
  lines[versions[0]] = `  version "${tag.replace(/^v/, '')}"`;
  for (const platform of ['darwin-arm64', 'darwin-amd64', 'linux-arm64', 'linux-amd64']) {
    const asset = `${name}-${platform}`;
    const matches = lines.flatMap((line, i) => /^\s*url "/.test(line) && line.trimEnd().endsWith(`/v#{version}/${asset}"`) ? [i] : []);
    if (matches.length !== 1 || !/^\s*sha256 "[a-fA-F0-9]{64}"\s*$/.test(lines[matches[0] + 1] || '')) {
      throw new Error(`Expected one URL/checksum pair for ${asset}`);
    }
    const url = `https://github.com/${context.repo.owner}/${name}/releases/download/${tag}/${asset}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Download failed for ${asset}: HTTP ${response.status}`);
    const hash = createHash('sha256');
    for await (const chunk of response.body) hash.update(chunk);
    lines[matches[0] + 1] = lines[matches[0] + 1].replace(/[a-fA-F0-9]{64}/, hash.digest('hex'));
  }
  const content = lines.join('\n');
  if (content === original) return core.info('Formula already up to date');
  await github.rest.repos.createOrUpdateFileContents({
    owner, repo, path, branch: 'main', sha: file.sha,
    message: `Update ${name} formula to ${tag.replace(/^v/, '')}`,
    content: Buffer.from(content).toString('base64'),
  });
};
