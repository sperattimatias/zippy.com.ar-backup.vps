import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/design/colors.dart';
import '../../shared/widgets/trip_status_chip.dart';

class InTripPage extends StatefulWidget {
  const InTripPage({super.key});

  @override
  State<InTripPage> createState() => _InTripPageState();
}

class _InTripPageState extends State<InTripPage> with TickerProviderStateMixin {
  late final AnimationController _moveController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
  late final AnimationController _haloController = AnimationController(vsync: this, duration: const Duration(milliseconds: 2500))..repeat(reverse: true);
  late Animation<double> _lat;
  late Animation<double> _lng;
  GoogleMapController? _mapController;
  LatLng current = const LatLng(-34.6037, -58.3816);
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _lat = AlwaysStoppedAnimation(current.latitude);
    _lng = AlwaysStoppedAnimation(current.longitude);
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _nextPoint());
  }

  Future<void> _nextPoint() async {
    final target = LatLng(current.latitude + 0.0007, current.longitude + 0.0005);
    _lat = Tween<double>(begin: current.latitude, end: target.latitude).animate(CurvedAnimation(parent: _moveController, curve: Curves.easeOutCubic));
    _lng = Tween<double>(begin: current.longitude, end: target.longitude).animate(CurvedAnimation(parent: _moveController, curve: Curves.easeOutCubic));
    _moveController
      ..reset()
      ..forward().whenComplete(() => setState(() => current = target));

    final moved = (target.latitude - current.latitude).abs() + (target.longitude - current.longitude).abs();
    if (moved > 0.0009) {
      await _mapController?.animateCamera(CameraUpdate.newLatLng(target));
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _moveController.dispose();
    _haloController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Viaje en curso')),
      body: AnimatedBuilder(
        animation: Listenable.merge([_moveController, _haloController]),
        builder: (_, __) {
          final pos = LatLng(_lat.value, _lng.value);
          final haloOpacity = 0.05 + ((_haloController.value) * 0.15);
          return Stack(
            children: [
              GoogleMap(
                initialCameraPosition: CameraPosition(target: pos, zoom: 14),
                myLocationButtonEnabled: false,
                onMapCreated: (c) => _mapController = c,
                markers: {
                  Marker(
                    markerId: const MarkerId('driver'),
                    position: pos,
                    infoWindow: const InfoWindow(title: 'Conductor'),
                  ),
                },
              ),
              Align(
                alignment: Alignment.center,
                child: IgnorePointer(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 320),
                    opacity: haloOpacity,
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: const BoxDecoration(color: ZippyColors.primary, shape: BoxShape.circle),
                    ),
                  ),
                ),
              ),
              const Positioned(top: 16, left: 20, child: TripStatusChip(status: 'IN_TRIP')),
              Positioned(
                bottom: 20,
                left: 20,
                right: 20,
                child: Card(
                  color: ZippyColors.surface,
                  child: ListTile(
                    title: const Text('Ruta monitoreada'),
                    subtitle: const Text('Movimiento del conductor suavizado en tiempo real'),
                    trailing: FilledButton(onPressed: () {}, child: const Text('Centrar')),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
