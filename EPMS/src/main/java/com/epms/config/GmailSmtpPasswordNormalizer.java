package com.epms.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Google App Passwords are often copied with spaces; JavaMail should use the 16
 * characters without spaces. Strips all whitespace in the password for Gmail SMTP only.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class GmailSmtpPasswordNormalizer implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        if (bean instanceof JavaMailSenderImpl impl) {
            String host = impl.getHost();
            String pw = impl.getPassword();
            if (StringUtils.hasText(host)
                    && host.toLowerCase().contains("gmail.com")
                    && StringUtils.hasText(pw)
                    && pw.indexOf(' ') >= 0) {
                impl.setPassword(pw.replaceAll("\\s+", ""));
            }
        }
        return bean;
    }
}
