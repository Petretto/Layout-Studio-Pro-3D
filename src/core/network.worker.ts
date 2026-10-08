import {executeNetworkRequest, type NetworkRequest, type NetworkReply} from './networkWorkerRequest';
const scope = self as unknown as {onmessage: (event: MessageEvent<NetworkRequest>) => void; postMessage: (reply: NetworkReply) => void};
scope.onmessage = event => executeNetworkRequest(event.data, reply => scope.postMessage(reply));
