const { createHash } = require('node:crypto');

module.exports = async ({ github, core }) => {
  const [owner, repo] = process.env.TAP.split('/');
  const { CASK: cask, APP_NAME: app, DESCRIPTION: description, HOMEPAGE: homepage, MACOS: macos, ARCH: arch } = process.env;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(cask)) throw new Error('Invalid cask token');
  if (!/^[a-z][a-z0-9_]*$/.test(macos)) throw new Error('Invalid macOS codename');
  if (!['arm64', 'intel'].includes(arch)) throw new Error('Invalid architecture');
  // Ruby single-quoted strings avoid interpolation of input values.
  const ruby = value => "'" + value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
  const version = process.env.TAG.slice(1);
  const response = await fetch(process.env.ASSET_URL, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`DMG download failed: HTTP ${response.status}`);
  const hash = createHash('sha256');
  for await (const chunk of response.body) hash.update(chunk);
  const content = `cask ${ruby(cask)} do
  version ${ruby(version)}
  sha256 ${ruby(hash.digest('hex'))}

  url ${ruby(process.env.ASSET_URL)}
  name ${ruby(app)}
  desc ${ruby(description)}
  homepage ${ruby(homepage)}

  depends_on arch: :${arch}
  depends_on macos: ">= :${macos}"

  app ${ruby(`${app}.app`)}
end
`;
  const target = { owner, repo, path: `Casks/${cask}.rb` };
  let existing;
  try {
    existing = (await github.rest.repos.getContent({ ...target, ref: 'main' })).data;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  if (existing && Buffer.from(existing.content, 'base64').toString() === content) {
    return core.info('Cask already up to date');
  }
  await github.rest.repos.createOrUpdateFileContents({
    ...target,
    branch: 'main',
    ...(existing ? { sha: existing.sha } : {}),
    message: `Update ${app} cask to ${version}`,
    content: Buffer.from(content).toString('base64'),
  });
};
