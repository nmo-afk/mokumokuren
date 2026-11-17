import {inspectReleaseConfiguration} from '../lib/release-readiness.mjs';
import {secureApiResponse} from '../lib/response-security.mjs';

/** Safe public endpoint for the first production-deployment acceptance check.
 * Only confirms configuration consistency, not provider OAuth or sync success.
 * Never returns configured values, secrets, or user information.
 */
export default async request => {
  if (request.method !== 'GET') {
    return secureApiResponse(Response.json({error:'Method not allowed'}, {status:405}));
  }
  const report=inspectReleaseConfiguration(Netlify.env,new URL(request.url).origin);
  return secureApiResponse(Response.json({
    release:'v1.0.0-candidate', configured:report.ready,
    note:report.ready?'Configuration present; live API verification still required':'Production configuration incomplete or origin mismatch',
  }, {status:report.ready?200:503}));
};
