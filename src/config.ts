/**
 * 
 *    iEdon-Net PeerAPI Frontend     
 *          Configutation            
 * 
 */

import pkg from '../package.json'
import { networkInfo } from './branding'

export default {
  root: '/',
  version: pkg.version,
  package: `${pkg.name}/${pkg.version}`,
  apiPrefix: 'https://api.dn42.luocynet.com',
  pingIntervalMs: 180000,
  configFallback: {
    netAsn: networkInfo.asn,
    netName: networkInfo.netName,
    netDesc: networkInfo.netDesc,
    footerText: '',
    maintenanceText: ''
  },
  gravatarUrlPrefix: 'https://www.gravatar.com/avatar/',
  openAuthOptions: {
    enableKioubit: true,
  },
  openAuthCallback: {
    // Compatibility:
    // will handle token to our type -> kioubit: 'https://dn42.luocynet.com/openAuth?type=kioubit',
    kioubit: 'https://dn42.luocynet.com/openAuth?token=kioubit.dn42',
  },
  mapDn42Url: '',
  metricPageRefreshInterval: 300000, // 5 minutes
}
