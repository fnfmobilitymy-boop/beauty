#!/usr/bin/env python3
"""Receive deployment configuration on stdin; never log credentials."""
import ipaddress,json,os,re,secrets,tempfile
from pathlib import Path
payload=json.load(__import__('sys').stdin)
host=payload.get('publicHost','').strip()
if not host:
    try:
        ip=ipaddress.ip_address(payload.get('serverHost',''))
        if not isinstance(ip,ipaddress.IPv4Address) or not ip.is_global:raise ValueError()
        host='kd-web.'+str(ip)+'.sslip.io'
    except ValueError:raise SystemExit('Set DEPLOY_PUBLIC_HOST to a public DNS hostname')
if not re.fullmatch(r'[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?',host) or '.' not in host:raise SystemExit('Invalid public hostname')
root=Path('deploy');private=root/'.private';private.mkdir(parents=True,exist_ok=True);private.chmod(0o700)
def read_env(path):
    if not path.exists():return {}
    result={}
    for line in path.read_text().splitlines():
        if line and not line.startswith('#'):
            name,value=line.split('=',1);result[name]=value
    return result
def write_env(path,values):
    for key,value in values.items():
        if not re.fullmatch(r'[A-Z_][A-Z0-9_]*',key) or any(c in str(value) for c in '\r\n\x00'):raise SystemExit('Invalid environment field')
    fd,tmp=tempfile.mkstemp(dir=path.parent);os.fchmod(fd,0o600)
    with os.fdopen(fd,'w') as out:out.write(''.join(k+'='+str(v)+'\n' for k,v in values.items()))
    os.replace(tmp,path)
app=read_env(private/'app.env');worker=read_env(private/'runner.env')
token=app.get('KD_RUNNER_TOKEN') or worker.get('KD_RUNNER_TOKEN') or secrets.token_urlsafe(48)
if len(token)<32 or (worker.get('KD_RUNNER_TOKEN') and worker['KD_RUNNER_TOKEN']!=token):raise SystemExit('Existing runner credentials require operator reconciliation')
key=payload.get('aiKey','').strip() or app.get('KD_AI_API_KEY','')
if not key:raise SystemExit('Configure the real provider key through GitHub Secrets')
app.update(KD_RUNNER_TOKEN=token,KD_AI_API_KEY=key);app.setdefault('KD_CREDITS_BILLING','disabled');app.setdefault('KD_ADMIN_USER_IDS','')
worker['KD_RUNNER_TOKEN']=token
write_env(private/'app.env',app);write_env(private/'runner.env',worker);write_env(root/'.env',{'KD_PUBLIC_HOST':host})
print('Deployment configuration written; secrets not displayed')
