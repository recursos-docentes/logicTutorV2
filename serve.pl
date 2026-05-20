use strict;
use IO::Socket::INET;
use POSIX qw(SIGCHLD SIG_IGN);
$SIG{CHLD} = 'IGNORE';

my $port = 5500;
my $root = "C:/Users/zaeli/Downloads/cowork/logicTutor";

my %mime = (
    html => 'text/html; charset=utf-8',
    css  => 'text/css',
    js   => 'application/javascript',
    png  => 'image/png',
    jpg  => 'image/jpeg',
    svg  => 'image/svg+xml',
);

my $server = IO::Socket::INET->new(
    LocalPort => $port,
    Proto     => 'tcp',
    ReuseAddr => 1,
    Listen    => 10,
) or die "Cannot start: $!\n";

print "Serving at http://localhost:$port\n";

while (my $client = $server->accept) {
    my $pid = fork;
    if (!defined $pid) { close $client; next; }
    if ($pid) { close $client; next; }

    # child
    my $req = <$client>;
    $req =~ s/\r?\n//;
    my (undef, $path) = split ' ', $req;
    $path =~ s/\?.*//;
    $path = '/' if $path eq '';
    $path .= 'index.html' if $path =~ /\/$/;
    $path =~ s|/||;

    my $file = "$root/$path";
    if (-f $file) {
        my ($ext) = $file =~ /\.(\w+)$/;
        my $type = $mime{lc($ext) // ''} // 'application/octet-stream';
        open my $fh, '<', $file or do { print $client "HTTP/1.0 500\r\n\r\n"; close $client; exit; };
        local $/;
        my $body = <$fh>;
        close $fh;
        print $client "HTTP/1.0 200 OK\r\nContent-Type: $type\r\nContent-Length: " . length($body) . "\r\n\r\n$body";
    } else {
        print $client "HTTP/1.0 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot found: $path\n";
    }
    close $client;
    exit;
}
