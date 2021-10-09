import IFWorker from './../interactionfree'

const portMap = {
    // 'localhost': 20082,
    '101.132.135.237': 6082,
    'interactionfree.cn': 6082,
}
// const sslPortMap = {
//     'localhost': 20081,
//     '192.168.25.5': 81,
//     '172.16.60.200': 81,
//     'interactionfree.cn': 83,
// }

const currentDomain = ((window.location.hostname === 'localhost') || (window.location.hostname === '172.16.60.2')) ? '172.16.60.200' : window.location.hostname

let plainWorker = undefined
// let secureWorker = undefined

function IFWorkerInstance(ssl) {
    if (!plainWorker) plainWorker = IFWorker("ws://" + currentDomain + ":" + portMap[currentDomain] + "/ws/")
    return plainWorker
    // if (ssl === undefined) ssl = (currentDomain === 'interactionfree.cn')
    // if (ssl) {
    //     if (!secureWorker) secureWorker = IFWorker("wss://" + currentDomain + ":" + sslPortMap[currentDomain] + "/ws/")
    //     return secureWorker
    // } else {
    //     if (!plainWorker) plainWorker = IFWorker("ws://" + currentDomain + ":" + portMap[currentDomain] + "/ws/")
    //     return plainWorker
    // }
}

export default IFWorkerInstance