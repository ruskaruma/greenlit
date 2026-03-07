# Greenlit Deploy Checklist

## Vercel Environment Variables
- [ ] NEXTAUTH_URL = https://greenlit.ruskaruma.me
- [ ] All other vars from .env.example copied in

## Twilio Console
- [ ] Messaging > Try it out > Send a WhatsApp message > Sandbox settings
- [ ] "When a message comes in" = https://greenlit.ruskaruma.me/api/webhooks/whatsapp
- [ ] HTTP method = POST

## GitHub OAuth App
- [ ] Authorization callback URL = https://greenlit.ruskaruma.me/api/auth/callback/github

## Post-deploy verification
- [ ] curl https://greenlit.ruskaruma.me/api/agent/run -H "Authorization: Bearer greenlit-cron-2026" returns { updated: N }
- [ ] Upload a test script → check email arrives → check WhatsApp arrives
- [ ] Reply APPROVE to WhatsApp → check dashboard card moves columns live
