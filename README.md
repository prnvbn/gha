# gha

my reusable actions

## homebrew-release

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
