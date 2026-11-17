/** Run only in a controlled environment. No credentials are printed or stored.
 * Example: node scripts/release-preflight.mjs https://canonical.example
 */
import {inspectReleaseConfiguration} from '../netlify/lib/release-readiness.mjs';
const origin=process.argv[2];
if (!origin || !/^https:\/\//.test(origin)) {
 console.error('Usage: node scripts/release-preflight.mjs https://canonical-origin.example');
 process.exitCode=2;
} else {
 const report=inspectReleaseConfiguration({get:key=>process.env[key]},origin);
 for (const [name,ok] of Object.entries(report.checks)) console.log(`${ok?'PASS':'BLOCKED'} ${name}`);
 console.log(report.ready?'Deployment configuration preflight passed. Live integrations remain untested.':'Do not publish: resolve the configuration checks above in the Netlify Functions environment.');
 if(!report.ready)process.exitCode=1;
}
