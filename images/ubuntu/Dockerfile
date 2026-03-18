FROM ubuntu:22.04

LABEL awsmock.ami.name="Ubuntu Server 22.04 LTS" \
      awsmock.ami.description="Canonical, Ubuntu, 22.04 LTS, amd64 jammy image" \
      awsmock.ami.platform="Linux" \
      awsmock.ami.architecture="x86_64"

RUN apt-get update && \
    apt-get install -y openssh-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /run/sshd && \
    echo 'root:password' | chpasswd && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
