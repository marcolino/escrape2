#!/bin/sh
#
# Create a server key and certificateconsole.log (see http://superuser.com/questions/226192/openssl-without-prompt)

# parameters
path="api/secure" # directory where to build key and certificate
certificateType="rsa:4096" # RSA, 4096 bits
certificateDurationDays="$((365 * 100))" # 100 years
certificateCountry="IT" # certificate country
certificateState="Italy" # certificate state
certificateLocality="Torino" # certificate locality
certificateOrganization="myself" # certificate organization
certificateOrganizationUnit="Development" # certificate organization unit
certificateCommonName="Marco Solari/emailAddress=marcosolari@gmail.com" # certificate common name

cd "$path"
if [ $? != 0 ]; then exit 1; fi

# generate a private key and a self-signed certificate
openssl req \
  -new \
  -newkey "$certificateType" \
  -days "$certificateDurationDays" \
  -nodes \
  -x509 \
  -subj "/C=$certificateCountry/ST=$certificateState/L=$certificateLocality/O=$certificateOrganization/OU=$certificateOrganizationUnit/CN=$certificateCommonName" \
  -keyout server.key \
  -out server.crt

exit 0