# Working on sand

## Run from a clone

You need Bun and git. Clone this repository, run `bun install` in it, and then run `bun run sand`. sand starts in the background and opens in your browser.

## Run the checks

Run `bun run check` before you push. It type-checks every package and plugin, then runs `vrui-check` on the web UI code. CI runs the same check on every push.

## Change VRUI or drydock

sand installs [VRUI](https://github.com/vaakx-dev/vrui) and [drydock](https://github.com/vaakx-dev/drydock) from GitHub, pinned to release tags in each `package.json`. To change one of them, change it in its own repository and release a new version there. Then move the tag in sand's `package.json` files and run `bun install`.

## Release a version

Releases are Git tags. sand reads its version from `apps/sand/package.json`. To release the next alpha:

1. In `apps/sand`, run `bun pm version prerelease --preid alpha`. It raises the version, for example from `0.1.0-alpha.1` to `0.1.0-alpha.2`. Because `apps/sand` is not the repository root, it doesn't commit or tag.
2. Commit the change with the message `chore: release 0.1.0-alpha.2`.
3. Run `git tag -a v0.1.0-alpha.2 -m v0.1.0-alpha.2`.
4. Run `git push --follow-tags`.

The release workflow runs the checks on the tag and publishes a GitHub release with notes generated from the commits. If the checks fail, it publishes nothing. A version with a suffix such as `-alpha.2` is published as a pre-release.

The nightly workflow runs once a day. If `main` has changed since the last nightly build and the checks pass, it moves the `nightly` tag and its pre-release to the newest commit on `main`. You can also start it by hand from the Actions tab.

The dev workflow runs on every push to `main`. If the checks pass, it moves the `dev` tag and its pre-release to that commit. To try your changes on your own PCs, set **Updates from** to **Dev** in **Settings**, push, and click **Check now** once the workflow finishes.
