// Run from the benchmark checkout after its frozen install.
import assert from 'node:assert/strict';
import { appendFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const tracks = {
  official: ['@computesdk/createos-sandbox', '0.1.33', '@nodeops-createos/sandbox', '0.8.3'],
  bhautikin: ['@bhautikin/ccos', '0.1.12', '@bhautikin/createos-sandbox', '0.8.3'],
};
const [providerName, providerVersion, sdkName, sdkVersion] = tracks[process.argv[2]];

const rootRequire = createRequire(resolve('package.json'));
const manifest = path => JSON.parse(readFileSync(path, 'utf8'));
const adapterEntry = rootRequire.resolve('@computesdk/createos-sandbox');
const providerRequire = createRequire(adapterEntry);
const adapter = manifest(resolve(dirname(adapterEntry), '../package.json'));
assert.equal(adapter.name, providerName);
assert.equal(adapter.version, providerVersion);
const sdkPath = providerRequire.resolve(sdkName + '/package.json');
assert.equal(rootRequire.resolve('@nodeops-createos/sandbox/package.json'), sdkPath);
const sdk = manifest(sdkPath);
assert.equal(sdk.name, sdkName);
assert.equal(sdk.version, sdkVersion);

const label = pkg => pkg.name + '@' + pkg.version;
console.log('Verified adapter', label(adapter), 'and SDK', label(sdk));
if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, 'ADAPTER_RELEASE=' + label(adapter) + '\nSDK_RELEASE=' + label(sdk) + '\n');
}
