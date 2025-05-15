<?php
echo "Hash pour 'password123': " . password_hash("password123", PASSWORD_DEFAULT) . "<br>";
echo "Hash pour 'adminPass': " . password_hash("adminPass", PASSWORD_DEFAULT) . "<br>";
echo "Hash pour 'employeePass': " . password_hash("employeePass", PASSWORD_DEFAULT) . "<br>";
?>