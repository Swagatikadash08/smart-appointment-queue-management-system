// socket.js
// Requires server to serve socket.io at same origin
const SocketClient = (function(){
  let socket = null;

  function connect(){
    if(socket) return socket;
    // Connect with token auth via query param or auth depending on backend
    const token = Api.getToken();
    const opts = {};
    if(token) opts.auth = { token };
    // if your server uses path '/socket.io' default, this is fine
    socket = io('/', opts);

    socket.on('connect', ()=> console.log('socket connected', socket.id));
    socket.on('disconnect', ()=> console.log('socket disconnected'));

    // generic events
    socket.on('queue:updated', (payload)=> {
      document.dispatchEvent(new CustomEvent('queue:updated', { detail: payload }));
    });

    socket.on('appointment:served', (payload)=>{
      document.dispatchEvent(new CustomEvent('appointment:served', { detail: payload }));
    });

    socket.on('appointment:cancelled', (payload)=>{
      document.dispatchEvent(new CustomEvent('appointment:cancelled', { detail: payload }));
    });

    socket.on('next:customer', (payload)=>{
      // payload: { appointmentId, service, branch }
      document.dispatchEvent(new CustomEvent('next:customer', { detail: payload }));
    });

    return socket;
  }

  function emit(event, data){
    if(!socket) connect();
    socket.emit(event, data);
  }

  function disconnect(){
    if(socket){ socket.disconnect(); socket = null; }
  }

  return { connect, emit, disconnect };
})();
