import 'package:socket_io_client/socket_io_client.dart' as io;

import '../env/app_env.dart';

class SocketService {
  io.Socket? _socket;

  void connect(String token) {
    _socket?.dispose();
    _socket = io.io(
      AppEnv.socketBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .build(),
    );
    _socket?.connect();
  }

  void joinUserRoom(String userId) => _socket?.emit('join', {'room': 'user:$userId'});
  void joinDriverRoom(String driverId) => _socket?.emit('join', {'room': 'driver:$driverId'});
  void joinTripRoom(String tripId) => _socket?.emit('join', {'room': 'trip:$tripId'});

  void on(String event, void Function(dynamic) listener) => _socket?.on(event, listener);
  void off(String event) => _socket?.off(event);

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
