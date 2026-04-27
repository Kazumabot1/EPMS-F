package com.epms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Logs whether outbound SMTP is configured (never logs passwords). Helps diagnose missing env/.env.
 */
@Component
@Order(1)
@Slf4j
public class SmtpSettingsStartupLogger implements ApplicationRunner {

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.port:0}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${app.mail.from:}")
    private String from;

    @Value("${app.onboarding.login-url:}")
    private String loginUrl;

    @Override
    public void run(ApplicationArguments args) {
        String stmpOnly = System.getenv("STMP_PASS");
        String stmpUserOnly = System.getenv("STMP_USER");
        if (StringUtils.hasText(stmpOnly) && !StringUtils.hasText(System.getenv("SMTP_PASS"))) {
            log.info(
                    "STMP_PASS is set (spelling: STMP_). The usual name is SMTP_PASS; this app accepts both. "
            );
        }
        if (StringUtils.hasText(stmpUserOnly) && !StringUtils.hasText(System.getenv("SMTP_USER"))) {
            log.info("STMP_USER is set; the usual name is SMTP_USER; this app accepts both.");
        }
        if (!StringUtils.hasText(password)) {
            log.warn(
                    "No mail password resolved (set SMTP_PASS or STMP_PASS to a Google App Password for the sender). "
                            + "A normal Gmail password or placeholder text will always fail with 535 "
                            + "BadCredentials until a real App Password is set."
            );
        }

        log.info(
                "Mail (startup): smtpHost='{}' smtpPort={} usernameSet={} passwordSet={} fromAddress='{}' appLoginUrl='{}'",
                StringUtils.hasText(host) ? host : "(not set — outbound mail will fail until configured)",
                port,
                StringUtils.hasText(username),
                StringUtils.hasText(password),
                StringUtils.hasText(from) ? from : "(empty)",
                loginUrl
        );
    }
}
