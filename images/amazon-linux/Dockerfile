FROM amazonlinux:2023

LABEL awsmock.ami.name="Amazon Linux 2023 AMI" \
      awsmock.ami.description="Amazon Linux 2023 AMI 2023.3.20240312.0" \
      awsmock.ami.platform="Linux" \
      awsmock.ami.architecture="x86_64"

RUN yum install -y openssh-server passwd shadow-utils && \
    yum clean all && \
    ssh-keygen -A && \
    echo 'root:password' | chpasswd && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    mkdir -p /run/sshd

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
