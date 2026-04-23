-- ─────────────────────────────────────────────────────────────────────
--  Physician Performance Seed Data — appointment_ids 500–779
--  Run in Railway query console (single INSERT, no DELIMITER needed)
--
--  Score formula: ROUND(completion_rate × 0.70 + GREATEST(100 − noshow_rate, 0) × 0.30)
--
--  Tiers:
--    HIGH  (~93): phys 1, 3, 5, 7, 21, 22  — 9 Completed + 1 Cancelled
--    SOLID (~76): phys 2, 4, 9, 13, 17, 25, 28 — 7C + 1 No-Show + 2 Cancelled
--    MID   (~56): phys 8, 11, 14, 19, 24, 27   — 5C + 3 No-Show + 2 Cancelled
--    LOW   (~39): phys 6, 10, 15, 18, 23, 26, 30 — 3C + 4 No-Show + 3 Cancelled
--    SPARSE(~66): phys 12, 16, 20, 29            — 3C + 1 No-Show + 1 Cancelled
-- ─────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO appointment
  (appointment_id, patient_id, physician_id, office_id,
   appointment_date, appointment_time, status_id,
   booking_method, reason_for_visit, appointment_type, duration_minutes)
VALUES

-- ═══ HIGH (~93) — 9 Completed + 1 Cancelled ══════════════════════════

-- Physician 1 — Emily Johnson (Internal Medicine, Dallas, Office 1)
(500,1,1,1,'2026-04-15','09:00:00',2,'Online','Annual physical','Physical',30),
(501,2,1,1,'2026-04-10','10:00:00',2,'Online','Follow-up visit','Follow-Up',30),
(502,3,1,1,'2026-04-05','11:00:00',2,'Online','General checkup','General',30),
(503,4,1,1,'2026-04-01','14:00:00',2,'Online','Routine exam','Physical',30),
(504,5,1,1,'2026-03-25','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(505,1,1,1,'2026-03-20','10:00:00',2,'Online','General visit','General',30),
(506,2,1,1,'2026-03-15','11:00:00',2,'Online','Physical exam','Physical',30),
(507,3,1,1,'2026-03-10','14:00:00',2,'Online','Follow-up','Follow-Up',30),
(508,4,1,1,'2026-03-05','15:00:00',2,'Online','Checkup','General',30),
(509,5,1,1,'2026-02-25','09:00:00',3,'Online','Rescheduled','Physical',30),

-- Physician 3 — Patricia Moore (Family Medicine, Houston, Office 2)
(510,1,3,2,'2026-04-15','09:30:00',2,'Online','Annual physical','Physical',30),
(511,2,3,2,'2026-04-10','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(512,3,3,2,'2026-04-05','11:30:00',2,'Online','General checkup','General',30),
(513,4,3,2,'2026-04-01','14:30:00',2,'Online','Routine exam','Physical',30),
(514,5,3,2,'2026-03-25','09:30:00',2,'Online','Follow-up','Follow-Up',30),
(515,1,3,2,'2026-03-20','10:30:00',2,'Online','General visit','General',30),
(516,2,3,2,'2026-03-15','11:30:00',2,'Online','Physical exam','Physical',30),
(517,3,3,2,'2026-03-10','14:30:00',2,'Online','Follow-up','Follow-Up',30),
(518,4,3,2,'2026-03-05','15:30:00',2,'Online','Checkup','General',30),
(519,5,3,2,'2026-02-25','09:30:00',3,'Online','Rescheduled','Physical',30),

-- Physician 5 — Robert Davis (General Practice, Austin, Office 3)
(520,1,5,3,'2026-04-15','09:00:00',2,'Online','Annual physical','Physical',30),
(521,2,5,3,'2026-04-10','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(522,3,5,3,'2026-04-05','11:00:00',2,'Online','General checkup','General',30),
(523,4,5,3,'2026-04-01','14:00:00',2,'Online','Routine exam','Physical',30),
(524,5,5,3,'2026-03-25','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(525,1,5,3,'2026-03-20','10:00:00',2,'Online','General visit','General',30),
(526,2,5,3,'2026-03-15','11:00:00',2,'Online','Physical exam','Physical',30),
(527,3,5,3,'2026-03-10','14:00:00',2,'Online','Follow-up','Follow-Up',30),
(528,4,5,3,'2026-03-05','15:00:00',2,'Online','Checkup','General',30),
(529,5,5,3,'2026-02-25','09:00:00',3,'Online','Rescheduled','Physical',30),

-- Physician 7 — Michael Chen (Family Medicine, Dallas, Office 1)
(530,1,7,1,'2026-04-15','10:00:00',2,'Online','Annual physical','Physical',30),
(531,2,7,1,'2026-04-10','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(532,3,7,1,'2026-04-05','14:00:00',2,'Online','General checkup','General',30),
(533,4,7,1,'2026-04-01','15:00:00',2,'Online','Routine exam','Physical',30),
(534,5,7,1,'2026-03-25','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(535,1,7,1,'2026-03-20','11:00:00',2,'Online','General visit','General',30),
(536,2,7,1,'2026-03-15','14:00:00',2,'Online','Physical exam','Physical',30),
(537,3,7,1,'2026-03-10','15:00:00',2,'Online','Follow-up','Follow-Up',30),
(538,4,7,1,'2026-03-05','09:00:00',2,'Online','Checkup','General',30),
(539,5,7,1,'2026-02-25','10:00:00',3,'Online','Rescheduled','Physical',30),

-- Physician 21 — Brian Wilson (Internal Medicine, Plano, Office 6)
(540,1,21,6,'2026-04-15','09:00:00',2,'Online','Annual physical','Physical',30),
(541,2,21,6,'2026-04-10','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(542,3,21,6,'2026-04-05','11:00:00',2,'Online','General checkup','General',30),
(543,4,21,6,'2026-04-01','14:00:00',2,'Online','Routine exam','Physical',30),
(544,5,21,6,'2026-03-25','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(545,1,21,6,'2026-03-20','10:00:00',2,'Online','General visit','General',30),
(546,2,21,6,'2026-03-15','11:00:00',2,'Online','Physical exam','Physical',30),
(547,3,21,6,'2026-03-10','14:00:00',2,'Online','Follow-up','Follow-Up',30),
(548,4,21,6,'2026-03-05','15:00:00',2,'Online','Checkup','General',30),
(549,5,21,6,'2026-02-25','09:00:00',3,'Online','Rescheduled','Physical',30),

-- Physician 22 — Michelle Clark (Family Medicine, Plano, Office 6)
(550,1,22,6,'2026-04-15','10:30:00',2,'Online','Annual physical','Physical',30),
(551,2,22,6,'2026-04-10','11:30:00',2,'Online','Follow-up','Follow-Up',30),
(552,3,22,6,'2026-04-05','14:30:00',2,'Online','General checkup','General',30),
(553,4,22,6,'2026-04-01','15:30:00',2,'Online','Routine exam','Physical',30),
(554,5,22,6,'2026-03-25','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(555,1,22,6,'2026-03-20','11:30:00',2,'Online','General visit','General',30),
(556,2,22,6,'2026-03-15','14:30:00',2,'Online','Physical exam','Physical',30),
(557,3,22,6,'2026-03-10','15:30:00',2,'Online','Follow-up','Follow-Up',30),
(558,4,22,6,'2026-03-05','09:30:00',2,'Online','Checkup','General',30),
(559,5,22,6,'2026-02-25','10:30:00',3,'Online','Rescheduled','Physical',30),

-- ═══ SOLID (~76) — 7 Completed + 1 No-Show + 2 Cancelled ════════════

-- Physician 2 — Maria Garcia (Orthopedics, Dallas, Office 1)
(560,1,2,1,'2026-04-14','09:00:00',2,'Online','Joint pain','Specialist',30),
(561,2,2,1,'2026-04-09','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(562,3,2,1,'2026-04-04','11:00:00',2,'Online','Orthopedic eval','Specialist',30),
(563,4,2,1,'2026-03-30','14:00:00',2,'Online','Checkup','General',30),
(564,5,2,1,'2026-03-24','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(565,1,2,1,'2026-03-18','10:00:00',2,'Online','Ortho consult','Specialist',30),
(566,2,2,1,'2026-03-12','11:00:00',2,'Online','General visit','General',30),
(567,3,2,1,'2026-03-06','14:00:00',4,'Online','No show','Specialist',30),
(568,4,2,1,'2026-02-28','15:00:00',3,'Online','Patient cancelled','Follow-Up',30),
(569,5,2,1,'2026-02-20','09:00:00',3,'Online','Patient cancelled','General',30),

-- Physician 4 — Angela White (Cardiology, Houston, Office 2)
(570,1,4,2,'2026-04-14','09:30:00',2,'Online','Cardiac consult','Specialist',30),
(571,2,4,2,'2026-04-09','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(572,3,4,2,'2026-04-04','11:30:00',2,'Online','EKG review','Specialist',30),
(573,4,4,2,'2026-03-30','14:30:00',2,'Online','Checkup','General',30),
(574,5,4,2,'2026-03-24','09:30:00',2,'Online','Follow-up','Follow-Up',30),
(575,1,4,2,'2026-03-18','10:30:00',2,'Online','Cardiology eval','Specialist',30),
(576,2,4,2,'2026-03-12','11:30:00',2,'Online','General visit','General',30),
(577,3,4,2,'2026-03-06','14:30:00',4,'Online','No show','Specialist',30),
(578,4,4,2,'2026-02-28','15:30:00',3,'Online','Patient cancelled','Follow-Up',30),
(579,5,4,2,'2026-02-20','09:30:00',3,'Online','Patient cancelled','General',30),

-- Physician 9 — James Martinez (Family Medicine, Houston, Office 2)
(580,1,9,2,'2026-04-14','10:00:00',2,'Online','Annual physical','Physical',30),
(581,2,9,2,'2026-04-09','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(582,3,9,2,'2026-04-04','14:00:00',2,'Online','General checkup','General',30),
(583,4,9,2,'2026-03-30','15:00:00',2,'Online','Routine exam','Physical',30),
(584,5,9,2,'2026-03-24','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(585,1,9,2,'2026-03-18','11:00:00',2,'Online','General visit','General',30),
(586,2,9,2,'2026-03-12','14:00:00',2,'Online','Physical exam','Physical',30),
(587,3,9,2,'2026-03-06','15:00:00',4,'Online','No show','Physical',30),
(588,4,9,2,'2026-02-28','10:00:00',3,'Online','Patient cancelled','Follow-Up',30),
(589,5,9,2,'2026-02-20','11:00:00',3,'Online','Patient cancelled','General',30),

-- Physician 13 — Carlos Rivera (Family Medicine, San Antonio, Office 4)
(590,1,13,4,'2026-04-14','09:00:00',2,'Online','Annual physical','Physical',30),
(591,2,13,4,'2026-04-09','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(592,3,13,4,'2026-04-04','11:00:00',2,'Online','General checkup','General',30),
(593,4,13,4,'2026-03-30','14:00:00',2,'Online','Routine exam','Physical',30),
(594,5,13,4,'2026-03-24','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(595,1,13,4,'2026-03-18','10:00:00',2,'Online','General visit','General',30),
(596,2,13,4,'2026-03-12','11:00:00',2,'Online','Physical exam','Physical',30),
(597,3,13,4,'2026-03-06','14:00:00',4,'Online','No show','Physical',30),
(598,4,13,4,'2026-02-28','15:00:00',3,'Online','Cancelled','Follow-Up',30),
(599,5,13,4,'2026-02-20','09:00:00',3,'Online','Cancelled','General',30),

-- Physician 17 — Jennifer Hall (Family Medicine, Fort Worth, Office 5)
(600,1,17,5,'2026-04-14','09:00:00',2,'Online','Annual physical','Physical',30),
(601,2,17,5,'2026-04-09','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(602,3,17,5,'2026-04-04','11:00:00',2,'Online','General checkup','General',30),
(603,4,17,5,'2026-03-30','14:00:00',2,'Online','Routine exam','Physical',30),
(604,5,17,5,'2026-03-24','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(605,1,17,5,'2026-03-18','10:00:00',2,'Online','General visit','General',30),
(606,2,17,5,'2026-03-12','11:00:00',2,'Online','Physical exam','Physical',30),
(607,3,17,5,'2026-03-06','14:00:00',4,'Online','No show','Physical',30),
(608,4,17,5,'2026-02-28','15:00:00',3,'Online','Cancelled','Follow-Up',30),
(609,5,17,5,'2026-02-20','09:00:00',3,'Online','Cancelled','General',30),

-- Physician 25 — Diana Torres (General Practice, El Paso, Office 7)
(610,1,25,7,'2026-04-14','09:00:00',2,'Online','Annual physical','Physical',30),
(611,2,25,7,'2026-04-09','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(612,3,25,7,'2026-04-04','11:00:00',2,'Online','General checkup','General',30),
(613,4,25,7,'2026-03-30','14:00:00',2,'Online','Routine exam','Physical',30),
(614,5,25,7,'2026-03-24','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(615,1,25,7,'2026-03-18','10:00:00',2,'Online','General visit','General',30),
(616,2,25,7,'2026-03-12','11:00:00',2,'Online','Physical exam','Physical',30),
(617,3,25,7,'2026-03-06','14:00:00',4,'Online','No show','Physical',30),
(618,4,25,7,'2026-02-28','15:00:00',3,'Online','Cancelled','Follow-Up',30),
(619,5,25,7,'2026-02-20','09:00:00',3,'Online','Cancelled','General',30),

-- Physician 28 — Christopher Hill (Family Medicine, Corpus Christi, Office 8)
(620,1,28,8,'2026-04-14','09:30:00',2,'Online','Annual physical','Physical',30),
(621,2,28,8,'2026-04-09','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(622,3,28,8,'2026-04-04','11:30:00',2,'Online','General checkup','General',30),
(623,4,28,8,'2026-03-30','14:30:00',2,'Online','Routine exam','Physical',30),
(624,5,28,8,'2026-03-24','09:30:00',2,'Online','Follow-up','Follow-Up',30),
(625,1,28,8,'2026-03-18','10:30:00',2,'Online','General visit','General',30),
(626,2,28,8,'2026-03-12','11:30:00',2,'Online','Physical exam','Physical',30),
(627,3,28,8,'2026-03-06','14:30:00',4,'Online','No show','Physical',30),
(628,4,28,8,'2026-02-28','15:30:00',3,'Online','Cancelled','Follow-Up',30),
(629,5,28,8,'2026-02-20','09:30:00',3,'Online','Cancelled','General',30),

-- ═══ MID (~56) — 5 Completed + 3 No-Show + 2 Cancelled ══════════════

-- Physician 8 — Sarah Kim (Internal Medicine, Dallas, Office 1)
(630,1,8,1,'2026-04-13','09:00:00',2,'Online','Annual physical','Physical',30),
(631,2,8,1,'2026-04-08','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(632,3,8,1,'2026-04-03','11:00:00',2,'Online','General checkup','General',30),
(633,4,8,1,'2026-03-29','14:00:00',2,'Online','Routine exam','Physical',30),
(634,5,8,1,'2026-03-23','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(635,1,8,1,'2026-03-17','10:00:00',4,'Online','No show','General',30),
(636,2,8,1,'2026-03-11','11:00:00',4,'Online','No show','Physical',30),
(637,3,8,1,'2026-03-05','14:00:00',4,'Online','No show','Follow-Up',30),
(638,4,8,1,'2026-02-27','15:00:00',3,'Online','Cancelled','General',30),
(639,5,8,1,'2026-02-19','09:00:00',3,'Online','Cancelled','Physical',30),

-- Physician 11 — David Lee (Geriatrics, Austin, Office 3)
(640,1,11,3,'2026-04-13','09:30:00',2,'Online','Geriatric eval','General',30),
(641,2,11,3,'2026-04-08','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(642,3,11,3,'2026-04-03','11:30:00',2,'Online','Annual checkup','Physical',30),
(643,4,11,3,'2026-03-29','14:30:00',2,'Online','Routine visit','General',30),
(644,5,11,3,'2026-03-23','09:30:00',2,'Online','Follow-up','Follow-Up',30),
(645,1,11,3,'2026-03-17','10:30:00',4,'Online','No show','General',30),
(646,2,11,3,'2026-03-11','11:30:00',4,'Online','No show','Physical',30),
(647,3,11,3,'2026-03-05','14:30:00',4,'Online','No show','Follow-Up',30),
(648,4,11,3,'2026-02-27','15:30:00',3,'Online','Cancelled','General',30),
(649,5,11,3,'2026-02-19','09:30:00',3,'Online','Cancelled','Physical',30),

-- Physician 14 — Amanda Scott (Internal Medicine, San Antonio, Office 4)
(650,1,14,4,'2026-04-13','10:00:00',2,'Online','Annual physical','Physical',30),
(651,2,14,4,'2026-04-08','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(652,3,14,4,'2026-04-03','14:00:00',2,'Online','General checkup','General',30),
(653,4,14,4,'2026-03-29','15:00:00',2,'Online','Routine exam','Physical',30),
(654,5,14,4,'2026-03-23','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(655,1,14,4,'2026-03-17','11:00:00',4,'Online','No show','General',30),
(656,2,14,4,'2026-03-11','14:00:00',4,'Online','No show','Physical',30),
(657,3,14,4,'2026-03-05','15:00:00',4,'Online','No show','Follow-Up',30),
(658,4,14,4,'2026-02-27','10:00:00',3,'Online','Cancelled','General',30),
(659,5,14,4,'2026-02-19','11:00:00',3,'Online','Cancelled','Physical',30),

-- Physician 19 — Robert Chan (Cardiology, Fort Worth, Office 5)
(660,1,19,5,'2026-04-13','09:00:00',2,'Online','Cardiac consult','Specialist',30),
(661,2,19,5,'2026-04-08','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(662,3,19,5,'2026-04-03','11:00:00',2,'Online','EKG review','Specialist',30),
(663,4,19,5,'2026-03-29','14:00:00',2,'Online','Checkup','General',30),
(664,5,19,5,'2026-03-23','09:00:00',2,'Online','Follow-up','Follow-Up',30),
(665,1,19,5,'2026-03-17','10:00:00',4,'Online','No show','Specialist',30),
(666,2,19,5,'2026-03-11','11:00:00',4,'Online','No show','General',30),
(667,3,19,5,'2026-03-05','14:00:00',4,'Online','No show','Follow-Up',30),
(668,4,19,5,'2026-02-27','15:00:00',3,'Online','Cancelled','Specialist',30),
(669,5,19,5,'2026-02-19','09:00:00',3,'Online','Cancelled','General',30),

-- Physician 24 — Priya Sharma (Urology, Plano, Office 6)
(670,1,24,6,'2026-04-13','09:30:00',2,'Online','Urology consult','Specialist',30),
(671,2,24,6,'2026-04-08','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(672,3,24,6,'2026-04-03','11:30:00',2,'Online','Specialist visit','Specialist',30),
(673,4,24,6,'2026-03-29','14:30:00',2,'Online','Checkup','General',30),
(674,5,24,6,'2026-03-23','09:30:00',2,'Online','Follow-up','Follow-Up',30),
(675,1,24,6,'2026-03-17','10:30:00',4,'Online','No show','Specialist',30),
(676,2,24,6,'2026-03-11','11:30:00',4,'Online','No show','General',30),
(677,3,24,6,'2026-03-05','14:30:00',4,'Online','No show','Follow-Up',30),
(678,4,24,6,'2026-02-27','15:30:00',3,'Online','Cancelled','Specialist',30),
(679,5,24,6,'2026-02-19','09:30:00',3,'Online','Cancelled','General',30),

-- Physician 27 — Sandra Collins (Neurology, El Paso, Office 7)
(680,1,27,7,'2026-04-13','10:00:00',2,'Online','Neurology consult','Specialist',30),
(681,2,27,7,'2026-04-08','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(682,3,27,7,'2026-04-03','14:00:00',2,'Online','Neurological eval','Specialist',30),
(683,4,27,7,'2026-03-29','15:00:00',2,'Online','Checkup','General',30),
(684,5,27,7,'2026-03-23','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(685,1,27,7,'2026-03-17','11:00:00',4,'Online','No show','Specialist',30),
(686,2,27,7,'2026-03-11','14:00:00',4,'Online','No show','General',30),
(687,3,27,7,'2026-03-05','15:00:00',4,'Online','No show','Follow-Up',30),
(688,4,27,7,'2026-02-27','10:00:00',3,'Online','Cancelled','Specialist',30),
(689,5,27,7,'2026-02-19','11:00:00',3,'Online','Cancelled','General',30),

-- ═══ LOW (~39) — 3 Completed + 4 No-Show + 3 Cancelled ══════════════

-- Physician 6 — Rachel Foster (Neurology, Austin, Office 3)
(690,1,6,3,'2026-04-12','09:00:00',2,'Online','Neurology consult','Specialist',30),
(691,2,6,3,'2026-04-07','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(692,3,6,3,'2026-04-02','11:00:00',2,'Online','Neurological eval','Specialist',30),
(693,4,6,3,'2026-03-28','14:00:00',4,'Online','No show','General',30),
(694,5,6,3,'2026-03-22','09:00:00',4,'Online','No show','Specialist',30),
(695,1,6,3,'2026-03-16','10:00:00',4,'Online','No show','Follow-Up',30),
(696,2,6,3,'2026-03-10','11:00:00',4,'Online','No show','Specialist',30),
(697,3,6,3,'2026-03-04','14:00:00',3,'Online','Cancelled','General',30),
(698,4,6,3,'2026-02-26','15:00:00',3,'Online','Cancelled','Follow-Up',30),
(699,5,6,3,'2026-02-18','09:00:00',3,'Online','Cancelled','Specialist',30),

-- Physician 10 — Karen Thompson (Internal Medicine, Houston, Office 2)
(700,1,10,2,'2026-04-12','09:30:00',2,'Online','Annual physical','Physical',30),
(701,2,10,2,'2026-04-07','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(702,3,10,2,'2026-04-02','11:30:00',2,'Online','General checkup','General',30),
(703,4,10,2,'2026-03-28','14:30:00',4,'Online','No show','Physical',30),
(704,5,10,2,'2026-03-22','09:30:00',4,'Online','No show','Follow-Up',30),
(705,1,10,2,'2026-03-16','10:30:00',4,'Online','No show','General',30),
(706,2,10,2,'2026-03-10','11:30:00',4,'Online','No show','Physical',30),
(707,3,10,2,'2026-03-04','14:30:00',3,'Online','Cancelled','Follow-Up',30),
(708,4,10,2,'2026-02-26','15:30:00',3,'Online','Cancelled','General',30),
(709,5,10,2,'2026-02-18','09:30:00',3,'Online','Cancelled','Physical',30),

-- Physician 15 — Thomas Brown (Oncology, San Antonio, Office 4)
(710,1,15,4,'2026-04-12','10:00:00',2,'Online','Oncology consult','Specialist',30),
(711,2,15,4,'2026-04-07','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(712,3,15,4,'2026-04-02','14:00:00',2,'Online','Cancer screening','Specialist',30),
(713,4,15,4,'2026-03-28','15:00:00',4,'Online','No show','General',30),
(714,5,15,4,'2026-03-22','10:00:00',4,'Online','No show','Specialist',30),
(715,1,15,4,'2026-03-16','11:00:00',4,'Online','No show','Follow-Up',30),
(716,2,15,4,'2026-03-10','14:00:00',4,'Online','No show','Specialist',30),
(717,3,15,4,'2026-03-04','15:00:00',3,'Online','Cancelled','General',30),
(718,4,15,4,'2026-02-26','10:00:00',3,'Online','Cancelled','Follow-Up',30),
(719,5,15,4,'2026-02-18','11:00:00',3,'Online','Cancelled','Specialist',30),

-- Physician 18 — Kevin Wright (General Practice, Fort Worth, Office 5)
(720,1,18,5,'2026-04-12','09:00:00',2,'Online','Annual physical','Physical',30),
(721,2,18,5,'2026-04-07','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(722,3,18,5,'2026-04-02','11:00:00',2,'Online','General checkup','General',30),
(723,4,18,5,'2026-03-28','14:00:00',4,'Online','No show','Physical',30),
(724,5,18,5,'2026-03-22','09:00:00',4,'Online','No show','Follow-Up',30),
(725,1,18,5,'2026-03-16','10:00:00',4,'Online','No show','General',30),
(726,2,18,5,'2026-03-10','11:00:00',4,'Online','No show','Physical',30),
(727,3,18,5,'2026-03-04','14:00:00',3,'Online','Cancelled','Follow-Up',30),
(728,4,18,5,'2026-02-26','15:00:00',3,'Online','Cancelled','General',30),
(729,5,18,5,'2026-02-18','09:00:00',3,'Online','Cancelled','Physical',30),

-- Physician 23 — Steven Lewis (Orthopedics, Plano, Office 6)
(730,1,23,6,'2026-04-12','09:30:00',2,'Online','Orthopedic consult','Specialist',30),
(731,2,23,6,'2026-04-07','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(732,3,23,6,'2026-04-02','11:30:00',2,'Online','Joint evaluation','Specialist',30),
(733,4,23,6,'2026-03-28','14:30:00',4,'Online','No show','General',30),
(734,5,23,6,'2026-03-22','09:30:00',4,'Online','No show','Specialist',30),
(735,1,23,6,'2026-03-16','10:30:00',4,'Online','No show','Follow-Up',30),
(736,2,23,6,'2026-03-10','11:30:00',4,'Online','No show','Specialist',30),
(737,3,23,6,'2026-03-04','14:30:00',3,'Online','Cancelled','General',30),
(738,4,23,6,'2026-02-26','15:30:00',3,'Online','Cancelled','Follow-Up',30),
(739,5,23,6,'2026-02-18','09:30:00',3,'Online','Cancelled','Specialist',30),

-- Physician 26 — Richard Evans (Family Medicine, El Paso, Office 7)
(740,1,26,7,'2026-04-12','10:00:00',2,'Online','Annual physical','Physical',30),
(741,2,26,7,'2026-04-07','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(742,3,26,7,'2026-04-02','14:00:00',2,'Online','General checkup','General',30),
(743,4,26,7,'2026-03-28','15:00:00',4,'Online','No show','Physical',30),
(744,5,26,7,'2026-03-22','10:00:00',4,'Online','No show','Follow-Up',30),
(745,1,26,7,'2026-03-16','11:00:00',4,'Online','No show','General',30),
(746,2,26,7,'2026-03-10','14:00:00',4,'Online','No show','Physical',30),
(747,3,26,7,'2026-03-04','15:00:00',3,'Online','Cancelled','Follow-Up',30),
(748,4,26,7,'2026-02-26','10:00:00',3,'Online','Cancelled','General',30),
(749,5,26,7,'2026-02-18','11:00:00',3,'Online','Cancelled','Physical',30),

-- Physician 30 — Joshua Nelson (Pulmonology, Corpus Christi, Office 8)
(750,1,30,8,'2026-04-12','09:30:00',2,'Online','Pulm consult','Specialist',30),
(751,2,30,8,'2026-04-07','10:30:00',2,'Online','Follow-up','Follow-Up',30),
(752,3,30,8,'2026-04-02','11:30:00',2,'Online','Breathing eval','Specialist',30),
(753,4,30,8,'2026-03-28','14:30:00',4,'Online','No show','General',30),
(754,5,30,8,'2026-03-22','09:30:00',4,'Online','No show','Specialist',30),
(755,1,30,8,'2026-03-16','10:30:00',4,'Online','No show','Follow-Up',30),
(756,2,30,8,'2026-03-10','11:30:00',4,'Online','No show','Specialist',30),
(757,3,30,8,'2026-03-04','14:30:00',3,'Online','Cancelled','General',30),
(758,4,30,8,'2026-02-26','15:30:00',3,'Online','Cancelled','Follow-Up',30),
(759,5,30,8,'2026-02-18','09:30:00',3,'Online','Cancelled','Specialist',30),

-- ═══ SPARSE (~66) — 3 Completed + 1 No-Show + 1 Cancelled ═══════════

-- Physician 12 — Susan Nguyen (General Practice, Austin, Office 3)
(760,1,12,3,'2026-04-10','09:00:00',2,'Online','Annual physical','Physical',30),
(761,2,12,3,'2026-03-25','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(762,3,12,3,'2026-03-10','11:00:00',2,'Online','General checkup','General',30),
(763,4,12,3,'2026-02-25','14:00:00',4,'Online','No show','Physical',30),
(764,5,12,3,'2026-02-10','09:00:00',3,'Online','Cancelled','Follow-Up',30),

-- Physician 16 — Nina Patel (Rheumatology, San Antonio, Office 4)
(765,1,16,4,'2026-04-10','10:00:00',2,'Online','Rheumatology consult','Specialist',30),
(766,2,16,4,'2026-03-25','11:00:00',2,'Online','Follow-up','Follow-Up',30),
(767,3,16,4,'2026-03-10','14:00:00',2,'Online','Joint eval','Specialist',30),
(768,4,16,4,'2026-02-25','15:00:00',4,'Online','No show','General',30),
(769,5,16,4,'2026-02-10','10:00:00',3,'Online','Cancelled','Specialist',30),

-- Physician 20 — Lisa Monroe (Pulmonology, Fort Worth, Office 5)
(770,1,20,5,'2026-04-10','09:00:00',2,'Online','Pulm consult','Specialist',30),
(771,2,20,5,'2026-03-25','10:00:00',2,'Online','Follow-up','Follow-Up',30),
(772,3,20,5,'2026-03-10','11:00:00',2,'Online','Breathing eval','Specialist',30),
(773,4,20,5,'2026-02-25','14:00:00',4,'Online','No show','General',30),
(774,5,20,5,'2026-02-10','09:00:00',3,'Online','Cancelled','Specialist',30),

-- Physician 29 — Patricia Baker (Internal Medicine, Corpus Christi, Office 8)
(775,1,29,8,'2026-04-10','10:30:00',2,'Online','Annual physical','Physical',30),
(776,2,29,8,'2026-03-25','11:30:00',2,'Online','Follow-up','Follow-Up',30),
(777,3,29,8,'2026-03-10','14:30:00',2,'Online','General checkup','General',30),
(778,4,29,8,'2026-02-25','15:30:00',4,'Online','No show','Physical',30),
(779,5,29,8,'2026-02-10','10:30:00',3,'Online','Cancelled','Follow-Up',30);
