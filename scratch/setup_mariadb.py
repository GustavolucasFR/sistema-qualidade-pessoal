import paramiko
import time

host = "15.235.33.204"
user = "root"
password = "E7@3G@wqpdft8uc"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host}...")
    client.connect(host, username=user, password=password)
    print("Connected successfully!")
    
    commands = [
        "mariadb -e 'SHOW DATABASES;'",
        "sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mariadb.conf.d/50-server.cnf",
        "sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/my.cnf",
        "systemctl restart mariadb",
        "mariadb -e \"GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'E7@3G@wqpdft8uc'; FLUSH PRIVILEGES;\"",
        "ufw allow 3306/tcp",
        "mariadb -e 'CREATE DATABASE IF NOT EXISTS postgres;'", # create postgres db just in case they used this name
        "mariadb -e 'CREATE DATABASE IF NOT EXISTS qualidade;'"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"Exit status: {exit_status}")
        if out: print(f"STDOUT:\n{out}")
        if err: print(f"STDERR:\n{err}")
        print("-" * 40)
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
