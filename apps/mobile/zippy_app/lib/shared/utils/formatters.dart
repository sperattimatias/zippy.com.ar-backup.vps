import 'package:intl/intl.dart';

String formatArs(int cents) {
  final amount = cents / 100;
  final formatter = NumberFormat.currency(locale: 'es_AR', symbol: r'$');
  return formatter.format(amount);
}
