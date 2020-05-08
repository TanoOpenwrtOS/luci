#!/usr/bin/perl
#
# A simple script to help resolve conflicts in "PO" files
# that may happen when merging.
#
# Copyright (c) 2020, Tano Systems LLC
# Author: Anton Kikin <a.kikin@tano-systems.com>
#
use strict;
use warnings;
use utf8;

binmode(STDOUT, ':utf8');

@ARGV == 1 || die "Usage: $0 <input-po-file>\n";

my $input = shift @ARGV;

open(my $fh, '<:encoding(UTF-8)', $input)
	or die "Could not open file '$input' $!";

my $data = join '', <$fh>;

#
# Remove merge conflicts in comments
# Correct comments will be restored with
# the i18n-update.pl utility
#
while ($data =~ s/^(<<<<<<<.*$(?>\s)(?>^#.*$(?>\s))*?^=======$(?>\s)(?>^#.*$(?>\s))*?^>>>>>>>.*$(?>\s))^//gmu)
	{ }

#
# Automatically resolve merge conflicts where
# the difference only in the comments.
#
while ($data =~ /(^<<<<<<<.*$(?>\s)((?>^.*$(?>\s))*?)^=======$(?>\s)((?>^.*$(?>\s))*?)^>>>>>>>.*$(?>\s)^)/gmu)
{
	my $full = $1;
	my $ours = $2;
	my $theirs = $3;

	# Remove comment lines
	$ours   =~ s/^#.*$(?>\s*)//gmu;
	$theirs =~ s/^#.*$(?>\s*)//gmu;

	if ($ours eq $theirs)
	{
		$data =~ s/$full/$ours/gmu;
	}
}

print $data
