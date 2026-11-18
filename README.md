# gha

my reusable actions

## homebrew-release

`package-type` selects `formula` (the default) or `cask`. Both use the same release selection and GitHub App authentication. Existing formula callers need no changes.

Updates `Formula/<repo-name>.rb` on the tap's `main` branch using public `<repo-name>-{darwin,linux}-{arm64,amd64}` binaries. Keeps the existing `v#{version}` URLs and replaces the version and checksums. Release events only update the latest stable release; manual runs can select a version. Missing App secrets fail with a clear error.

Add this workflow to the source repository:

```yaml
name: Homebrew release
on:
  release:
    types: [published, released, edited]
  workflow_dispatch:
    inputs:
      version:
        description: Version, empty uses latest stable
        required: false
        type: string
permissions:
  contents: read
concurrency:
  group: homebrew-release
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: prnvbn/gha/homebrew-release@v1
        with:
          app-id: ${{ secrets.GH_APP_ID }}
          app-private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}
          version: ${{ inputs.version }}
```

The App needs Contents write access to `prnvbn/homebrew-tap`. Override `tap` to use another tap. Publish this repo and create `v1` before using it. Releases created by `GITHUB_TOKEN` won't trigger another workflow; promote manually or use an App token.

### Casks

For `package-type: cask`, provide `cask`, `asset`, `app-name`, `description`, and `homepage`. `macos` defaults to `tahoe` and `arch` to `arm64`.

Creates or replaces `Casks/<cask>.rb` on the tap's `main` branch from a stable release asset. Computes SHA-256 from the downloaded asset and installs the named `.app`. The action owns the entire cask file. Supports one architecture per cask, `arm64` or `intel`.

```yaml
- uses: prnvbn/gha/homebrew-release@main
  with:
    app-id: ${{ secrets.GH_APP_ID }}
    app-private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}
    tap: your-org/homebrew-tap
    package-type: cask
    cask: example-app
    asset: ExampleApp-{version}-macos-arm64.dmg
    app-name: ExampleApp
    description: A short description of your app
    homepage: https://github.com/your-org/example-app
    macos: tahoe
    arch: arm64
```

`tap` defaults to `prnvbn/homebrew-tap`. `version` optionally selects a tag, with or without `v`; otherwise the latest stable release is used. Tags must use `vMAJOR.MINOR.PATCH`. Release events skip drafts, prereleases, and releases other than the latest. With no stable release, automatic runs do nothing and manual runs fail.

Use `contents: read` in the calling workflow. Install the GitHub App on the tap with Contents write permission and configure `GH_APP_ID` and `GH_APP_PRIVATE_KEY`. Serialize callers with a concurrency group. Releases created using `GITHUB_TOKEN` require a `workflow_run` completion trigger or manual promotion to trigger publishing. No source checkout is needed.
