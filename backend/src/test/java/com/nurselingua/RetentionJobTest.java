package com.nurselingua;

import com.nurselingua.entity.ConversationEntity;
import com.nurselingua.integration.UserResolver;
import com.nurselingua.repository.ConversationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Retention expiry (spec §6.5): conversations past expires_at are soft-deleted. */
@SpringBootTest
@ActiveProfiles("h2")
class RetentionJobTest {

  @Autowired ConversationRepository conversations;
  @Autowired UserResolver userResolver;

  @Test
  @Transactional
  void expiredConversationsAreSoftDeleted() {
    String uid = UUID.randomUUID().toString();
    var managedUser = userResolver.managed(uid); // REQUIRES_NEW commit: row is in the DB
    ConversationEntity live = conv(managedUser, Instant.now().plusSeconds(3600));
    ConversationEntity expired = conv(managedUser, Instant.now().minusSeconds(3600));
    ConversationEntity forever = conv(managedUser, null); // retention "off"

    int changed = conversations.expireConversations(Instant.now());

    assertTrue(changed >= 1);
    assertEquals(false, conversations.findById(live.getId()).orElseThrow().isDeleted());
    assertEquals(true, conversations.findById(expired.getId()).orElseThrow().isDeleted());
    assertEquals(false, conversations.findById(forever.getId()).orElseThrow().isDeleted());
  }

  private ConversationEntity conv(com.nurselingua.entity.UserEntity user, Instant expiresAt) {
    ConversationEntity c = new ConversationEntity();
    c.setUser(user);
    c.setNurseLanguage("en");
    c.setPatientLanguage("es");
    c.setExpiresAt(expiresAt);
    return conversations.save(c);
  }
}
