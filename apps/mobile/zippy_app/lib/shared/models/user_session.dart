class UserSession {
  final String userId;
  final List<String> roles;
  final String accessToken;

  const UserSession({required this.userId, required this.roles, required this.accessToken});

  bool get isDriver => roles.contains('driver');
  bool get isPassenger => roles.contains('passenger');
}
