import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../shared/copy/messages_es_ar.dart';
import '../../shared/design/colors.dart';
import '../../shared/widgets/trip_status_chip.dart';
import '../../shared/widgets/zippy_card.dart';
import '../../shared/widgets/zippy_empty_state.dart';
import '../../shared/widgets/zippy_primary_button.dart';
import '../../shared/widgets/zippy_secondary_button.dart';
import '../../shared/widgets/zippy_skeleton.dart';

class WaitingPage extends StatefulWidget {
  const WaitingPage({super.key});

  @override
  State<WaitingPage> createState() => _WaitingPageState();
}

class _WaitingPageState extends State<WaitingPage> {
  bool hasBid = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      setState(() => hasBid = true);
      HapticFeedback.lightImpact();
    });
  }

  Future<void> _acceptBid() async {
    HapticFeedback.mediumImpact();
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _SuccessPulse(),
    );
    if (!mounted) return;
    context.push('/ride/in-trip');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buscando conductor')),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        child: hasBid
            ? ListView(
                key: const ValueKey('with_bid'),
                padding: const EdgeInsets.all(20),
                children: [
                  const TripStatusChip(status: 'MATCHED'),
                  const SizedBox(height: 12),
                  ZippyCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Laura M. · Confiable', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        const Text('Oferta: \$ 2.650 · ETA 5 min'),
                        const SizedBox(height: 14),
                        ZippyPrimaryButton(label: 'Aceptar oferta', onPressed: _acceptBid),
                        const SizedBox(height: 8),
                        ZippySecondaryButton(label: 'Cancelar', onPressed: () => context.pop()),
                      ],
                    ),
                  ),
                ],
              )
            : ListView(
                key: const ValueKey('skeleton'),
                padding: const EdgeInsets.all(20),
                children: const [
                  TripStatusChip(status: 'REQUESTED'),
                  SizedBox(height: 16),
                  ZippySkeleton(height: 18),
                  SizedBox(height: 8),
                  ZippySkeleton(height: 14),
                  SizedBox(height: 8),
                  ZippySkeleton(height: 80),
                  SizedBox(height: 20),
                  ZippyEmptyState(
                    icon: Icons.timelapse,
                    title: MessagesEsAr.noBidsTitle,
                    subtitle: MessagesEsAr.noBidsSubtitle,
                    ctaLabel: 'Seguir esperando',
                  ),
                ],
              ),
      ),
    );
  }
}

class _SuccessPulse extends StatefulWidget {
  const _SuccessPulse();

  @override
  State<_SuccessPulse> createState() => _SuccessPulseState();
}

class _SuccessPulseState extends State<_SuccessPulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 420))..forward();

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 520), () {
      if (mounted) Navigator.pop(context);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ScaleTransition(
        scale: Tween<double>(begin: 1, end: 1.05).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut)),
        child: Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(color: ZippyColors.primaryMuted, shape: BoxShape.circle),
          child: const Icon(Icons.check, color: Colors.white, size: 36),
        ),
      ),
    );
  }
}
